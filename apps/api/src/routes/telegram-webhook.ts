import { Router } from "express";
import { MessageChannel, MessageDirection } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { answerCallbackQuery, sendTelegramMessage } from "../lib/telegram";
import { workoutQueue } from "../lib/queue";
import { logEvent, EventType } from "../lib/event-logger";
import { routeCoachCommand } from "../handlers/coachCommandRouter";

const router: Router = Router();

/**
 * POST /telegram/webhook/:coachId
 *
 * Per-coach Telegram webhook endpoint.
 * Each coach's bot has its own webhook pointing here with their coachId.
 * Handles incoming messages and callback queries (inline keyboard presses).
 */
router.post("/:coachId", async (req, res) => {
    const { coachId } = req.params;
    const update = req.body;

    // Always respond 200 immediately
    res.sendStatus(200);

    try {
        // Look up the bot registry to get the bot token for answering callbacks
        const botRegistry = await prisma.botRegistry.findUnique({ where: { coachId } });
        if (!botRegistry) {
            console.log(`[TG Webhook] No bot registered for coach ${coachId}`);
            return;
        }

        // Handle callback queries (inline keyboard button presses)
        if (update.callback_query) {
            const callbackQuery = update.callback_query;
            const chatId = String(callbackQuery.message.chat.id);
            const data = callbackQuery.callback_data || "";

            // Acknowledge the button press
            await answerCallbackQuery(botRegistry.botToken, callbackQuery.id);

            // Find client by telegram chat ID
            const client = await prisma.client.findUnique({
                where: { telegramChatId: chatId },
            });

            if (!client) {
                console.log(`[TG Webhook] Unknown Telegram user: ${chatId}`);
                return;
            }

            // Route callback data
            if (data.startsWith("workout_done_")) {
                await workoutQueue.add("process-message", {
                    clientId: client.id,
                    coachId: client.coachId,
                    body: "DONE",
                    messageSid: `tg_cb_${callbackQuery.id}`,
                    channel: MessageChannel.TELEGRAM,
                });
            } else if (data.startsWith("workout_skip_")) {
                // Handle skip — create a SKIPPED workout log
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
            } else if (data.startsWith("checkin_start_")) {
                // For now, direct to web form. Future: multi-step inline keyboard flow.
                const { sendTelegramMessage } = await import("../lib/telegram");
                await sendTelegramMessage(
                    botRegistry.botToken,
                    chatId,
                    `📊 Great! Please complete your check-in here:\n${process.env.WEB_URL}/dashboard/checkin`
                );
            }

            return;
        }

        // Handle regular messages
        if (update.message?.text) {
            const chatId = String(update.message.chat.id);
            const text = update.message.text;
            const messageId = update.message.message_id;

            // Find client by telegram chat ID
            const client = await prisma.client.findUnique({
                where: { telegramChatId: chatId },
            });

            if (!client) {
                // Check if this is a coach sending exercise commands
                if (/^\/(?:exercise|ex|send|workout)\b/i.test(text)) {
                    const response = await routeCoachCommand(coachId, text);
                    if (response) {
                        await sendTelegramMessage(botRegistry.botToken, chatId, response);
                    }
                    return;
                }

                console.log(`[TG Webhook] Unknown Telegram sender: ${chatId}`);

                // Handle /start command for new users
                if (text === "/start") {
                    await sendTelegramMessage(
                        botRegistry.botToken,
                        chatId,
                        "\u{1F44B} Welcome! Your coach will set you up on FitFlow. Please share this chat ID with your coach for onboarding."
                    );
                }
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
            await workoutQueue.add("process-message", {
                clientId: client.id,
                coachId: client.coachId,
                body: text,
                messageSid: `tg_${messageId}`,
                channel: MessageChannel.TELEGRAM,
            });
        }
    } catch (error) {
        console.error(`[TG Webhook] Error processing update for coach ${coachId}:`, error);
    }
});

export default router;
