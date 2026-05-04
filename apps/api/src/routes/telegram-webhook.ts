import crypto from "node:crypto";
import { Router } from "express";
import { MessageChannel, MessageDirection } from "@prisma/client";
import { TemplateId } from "@fitflow/shared";
import { prisma } from "../lib/prisma";
import { env } from "../lib/env";
import { answerCallbackQuery, sendTelegramMessage } from "../lib/telegram";
import { getChannel, getRecipientId } from "../lib/channels/channel-router";
import { messageQueue } from "../lib/queue";
import { getSharedBotToken } from "../lib/bot-provisioner";
import {
    startIntakeFlow,
    handleIntakeMessage,
    handleIntakeCallback,
    resumeIntakeFlow,
} from "../lib/telegram-intake";

const router: Router = Router();

/**
 * POST /telegram/webhook
 *
 * Single shared-bot webhook endpoint.
 * Coach context is resolved from the client's record (via telegramChatId),
 * or established via deep link (/start COACH_SLUG).
 */
router.post("/", async (req, res) => {
    const update = req.body;
    const botToken = getSharedBotToken();

    if (!botToken) {
        res.sendStatus(200);
        return;
    }

    // Validate webhook secret — fail closed if missing or mismatched (timing-safe)
    const incomingHeader = req.headers["x-telegram-bot-api-secret-token"];
    const incomingSecret = typeof incomingHeader === "string" ? incomingHeader : "";
    const expectedSecret = env.TG_WEBHOOK_SECRET ?? "";
    const incomingBuf = Buffer.from(incomingSecret);
    const expectedBuf = Buffer.from(expectedSecret);
    const secretValid =
        expectedBuf.length > 0 &&
        incomingBuf.length === expectedBuf.length &&
        crypto.timingSafeEqual(incomingBuf, expectedBuf);
    if (!secretValid) {
        console.warn("[TG Webhook] Invalid or missing secret token — rejecting.");
        res.sendStatus(401);
        return;
    }

    // Respond 200 immediately so Telegram doesn't retry while we process.
    res.sendStatus(200);

    try {
        // Handle callback queries (inline keyboard button presses)
        if (update.callback_query) {
            const callbackQuery = update.callback_query;
            if (!callbackQuery.message?.chat?.id) {
                console.log("[TG Webhook] Callback query missing message/chat");
                return;
            }
            const chatId = String(callbackQuery.message.chat.id);
            const data = callbackQuery.data || "";

            // Acknowledge the button press
            await answerCallbackQuery(botToken, callbackQuery.id);

            // Find client by telegram chat ID
            const client = await prisma.client.findUnique({
                where: { telegramChatId: chatId },
            });

            if (!client) {
                // Check if this is a lead going through intake
                const lead = await prisma.lead.findFirst({
                    where: { telegramChatId: chatId, status: { not: "CONVERTED" } },
                    orderBy: { createdAt: "desc" },
                });
                if (lead) {
                    const coach = await prisma.coach.findUnique({ where: { id: lead.coachId } });
                    const consumed = await handleIntakeCallback(
                        lead,
                        data,
                        chatId,
                        botToken,
                        coach?.name || "Your coach"
                    );
                    if (consumed) return;
                }
                console.log(`[TG Webhook] Unknown Telegram user: ${chatId}`);
                return;
            }

            // Route callback data
            if (data.startsWith("workout_done_")) {
                await messageQueue.add("process-message", {
                    clientId: client.id,
                    coachId: client.coachId,
                    body: "DONE",
                    messageSid: `tg_cb_${callbackQuery.id}`,
                    channel: MessageChannel.TELEGRAM,
                });
            } else if (data.startsWith("workout_skip_")) {
                const assignment = await prisma.planAssignment.findFirst({
                    where: { clientId: client.id, isActive: true },
                });

                if (assignment) {
                    const { differenceInDays } = await import("date-fns");
                    const dayNumber = differenceInDays(new Date(), assignment.startDate) + 1;

                    await prisma.workoutLog.create({
                        data: {
                            clientId: client.id,
                            assignmentId: assignment.id,
                            dayNumber,
                            status: "SKIPPED",
                            notes: "Skipped via Telegram",
                        },
                    });
                }
            } else if (data.startsWith("meal_done_") || data.startsWith("meal_skip_")) {
                const isCompleted = data.startsWith("meal_done_");
                const mealAssignment = await prisma.mealAssignment.findFirst({
                    where: { clientId: client.id, isActive: true },
                });
                if (mealAssignment) {
                    const { differenceInDays } = await import("date-fns");
                    const dayNumber = differenceInDays(new Date(), mealAssignment.startDate) + 1;
                    await prisma.mealLog.create({
                        data: {
                            clientId: client.id,
                            assignmentId: mealAssignment.id,
                            dayNumber,
                            status: isCompleted ? "COMPLETED" : "SKIPPED",
                            notes: isCompleted ? "Completed via Telegram" : "Skipped via Telegram",
                        },
                    });

                    // Compute compliance and send confirmation via template
                    const totalLogs = await prisma.mealLog.count({
                        where: { assignmentId: mealAssignment.id },
                    });
                    const completedLogs = await prisma.mealLog.count({
                        where: { assignmentId: mealAssignment.id, status: "COMPLETED" },
                    });
                    const compliance = totalLogs > 0 ? Math.round((completedLogs / totalLogs) * 100) : 100;

                    await prisma.mealAssignment.update({
                        where: { id: mealAssignment.id },
                        data: { compliance },
                    });

                    const channel = await getChannel(client.preferredChannel, client.coachId);
                    const recipientId = getRecipientId(client);
                    await channel.sendTemplate(recipientId, TemplateId.MEAL_LOGGED_CONFIRMATION, {
                        day_number: dayNumber,
                        client_first_name: client.name.split(" ")[0],
                        compliance,
                    }, client.id);
                }
            } else if (data.startsWith("checkin_start_")) {
                await sendTelegramMessage(
                    botToken,
                    chatId,
                    `\u{1F4CA} Great! Please complete your check-in here:\n${env.WEB_URL}/dashboard/checkin`
                );
            }

            return;
        }

        // Handle regular messages
        if (update.message?.text) {
            const chatId = String(update.message.chat.id);
            const text = update.message.text;
            const messageId = update.message.message_id;

            // Handle /start deep link — maps client to coach
            if (text.startsWith("/start")) {
                await handleStartCommand(botToken, chatId, text);
                return;
            }

            // Find client by telegram chat ID
            const client = await prisma.client.findUnique({
                where: { telegramChatId: chatId },
                include: { coach: true },
            });

            if (!client) {
                // Fall back to Lead lookup — store message against the lead
                const lead = await prisma.lead.findFirst({
                    where: { telegramChatId: chatId, status: { not: "CONVERTED" } },
                    orderBy: { createdAt: "desc" },
                });

                if (lead) {
                    await prisma.message.create({
                        data: {
                            leadId: lead.id,
                            channel: MessageChannel.TELEGRAM,
                            direction: MessageDirection.INBOUND,
                            content: text,
                            metaMessageId: `tg_${messageId}`,
                            status: "received",
                        },
                    });

                    // Check if intake flow should handle this message
                    const coach = await prisma.coach.findUnique({ where: { id: lead.coachId } });
                    const consumed = await handleIntakeMessage(
                        lead,
                        text,
                        botToken,
                        coach?.name || "Your coach"
                    );
                    if (consumed) return;

                    console.log(`[TG Webhook] Message stored for lead ${lead.id}`);
                    return;
                }

                // Neither client nor lead found
                await sendTelegramMessage(
                    botToken,
                    chatId,
                    "\u{1F44B} Welcome! Please use your coach's invite link to get started."
                );
                return;
            }

            // Log message in DB
            await prisma.message.create({
                data: {
                    clientId: client.id,
                    channel: MessageChannel.TELEGRAM,
                    direction: MessageDirection.INBOUND,
                    content: text,
                    metaMessageId: `tg_${messageId}`,
                    status: "received",
                },
            });

            // Queue for processing (handles "DONE" keyword etc.)
            await messageQueue.add("process-message", {
                clientId: client.id,
                coachId: client.coachId,
                body: text,
                messageSid: `tg_${messageId}`,
                channel: MessageChannel.TELEGRAM,
            });
        }
    } catch (error) {
        console.error("[TG Webhook] Error processing update:", error);
    }
});

/**
 * Handle /start deep link.
 * Format: /start COACH_SLUG
 *
 * If a coach slug is provided, creates a Lead record for the Telegram user
 * mapped to that coach. If the user is already a client, updates their chat ID.
 */
async function handleStartCommand(botToken: string, chatId: string, text: string): Promise<void> {
    const parts = text.split(" ");
    const slug = parts[1]?.trim();

    if (!slug) {
        await sendTelegramMessage(
            botToken,
            chatId,
            "\u{1F44B} Welcome to FitFlow! Please use your coach's invite link to get started."
        );
        return;
    }

    // Resolve coach by slug
    const coach = await prisma.coach.findUnique({ where: { slug } });
    if (!coach) {
        await sendTelegramMessage(
            botToken,
            chatId,
            "\u{274C} Sorry, we couldn't find that coach. Please check your invite link and try again."
        );
        return;
    }

    // Check if this Telegram user is already a client
    const existingClient = await prisma.client.findUnique({
        where: { telegramChatId: chatId },
    });

    if (existingClient) {
        // Already linked — send welcome back
        const coachName = coach.name || "Your coach";
        await sendTelegramMessage(
            botToken,
            chatId,
            `\u{1F44B} Welcome back! You're connected with ${coachName}.`
        );
        return;
    }

    // Check if there's an existing lead for this coach with this chat ID
    const existingLead = await prisma.lead.findFirst({
        where: { coachId: coach.id, telegramChatId: chatId },
    });

    const coachName = coach.name || "Your coach";

    if (existingLead) {
        // Resume intake if incomplete, otherwise welcome back
        await resumeIntakeFlow(existingLead, botToken, coachName);
        return;
    }

    // Create a new lead for this coach. The intake flow will overwrite this
    // placeholder with the real name once the user provides it.
    const newLead = await prisma.lead.create({
        data: {
            coachId: coach.id,
            name: "New Telegram Lead",
            source: "telegram",
            telegramChatId: chatId,
            channelTag: MessageChannel.TELEGRAM,
        },
    });

    // Start the intake questionnaire flow
    await startIntakeFlow(newLead, botToken, coachName);

    console.log(`[TG Webhook] New lead created for coach ${coach.id} from Telegram user ${chatId}`);
}

export default router;
