import crypto from "node:crypto";
import { Router } from "express";
import { MessageChannel, MessageDirection, WorkoutStatus, MealStatus } from "@prisma/client";
import { TemplateId } from "@fitflow/shared";
import { messageQueue } from "../lib/queue";
import { prisma } from "../lib/prisma";
import { env } from "../lib/env";
import { routeCoachCommand } from "../handlers/coachCommandRouter";
import { sendWhatsAppMessage, sendCheckinFlow, MetaErrorCode } from "../lib/meta";
import { logEvent, EventType } from "../lib/event-logger";
import { getChannel, getRecipientId } from "../lib/channels/channel-router";
import { META_TEMPLATES } from "../lib/templates/meta-templates";
import { differenceInDays } from "date-fns";

const router: Router = Router();

/**
 * Verify Meta webhook signature using X-Hub-Signature-256 header.
 * Returns true if the signature is valid.
 */
// Mask a phone number for logging — keep last 4 digits only.
function redactPhone(phone: string | undefined | null): string {
    if (!phone) return "***";
    return phone.length <= 4 ? "***" : `***${phone.slice(-4)}`;
}

function verifyMetaSignature(rawBody: Buffer, signature: string, appSecret: string): boolean {
    const hmac = crypto.createHmac("sha256", appSecret);
    hmac.update(rawBody);
    const expected = `sha256=${hmac.digest("hex")}`;
    try {
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════
// FLOW RESPONSE HANDLERS
// ═══════════════════════════════════════════════════════════════

interface FlowResponse {
    flow_token: string;
    flow_type?: string;
    [key: string]: any;
}

const summarizeMetaWebhookEvent = (body: any) => {
    const value = body?.entry?.[0]?.changes?.[0]?.value;
    const messages = value?.messages ?? [];
    const statuses = value?.statuses ?? [];

    return {
        object: body?.object,
        phoneNumberId: value?.metadata?.phone_number_id,
        displayPhoneNumber: value?.metadata?.display_phone_number,
        messageCount: messages.length,
        statusCount: statuses.length,
        messageTypes: messages.map((message: any) => message.type).filter(Boolean),
        statuses: statuses.map((status: any) => ({
            id: status.id,
            status: status.status,
            recipientId: status.recipient_id,
            errorCodes: (status.errors ?? []).map((error: any) => error.code),
            errorTitles: (status.errors ?? []).map((error: any) => error.title),
        })),
    };
};

/**
 * Process a weekly check-in flow response
 */
async function handleCheckinFlowResponse(clientId: string, data: FlowResponse) {
    const rawWeight = Number.parseFloat(data.weight);
    const weightUnit = data.weight_unit;
    const rawEnergy = Number.parseInt(data.energy, 10);
    const sleep = data.sleep;
    const notes = data.notes || null;

    // Validate parsed numbers — reject NaN or out-of-range values rather than persisting garbage.
    if (Number.isNaN(rawWeight) || rawWeight <= 0 || rawWeight > 500) {
        console.error(`[Flow] Invalid weight for client ${clientId}: ${data.weight}`);
        throw new Error(`Invalid weight value: ${data.weight}`);
    }

    if (Number.isNaN(rawEnergy) || rawEnergy < 1 || rawEnergy > 5) {
        console.error(`[Flow] Invalid energy for client ${clientId}: ${data.energy}`);
        throw new Error(`Invalid energy value (must be 1–5): ${data.energy}`);
    }

    if (!sleep || typeof sleep !== "string") {
        console.error(`[Flow] Missing or invalid sleep for client ${clientId}: ${data.sleep}`);
        throw new Error(`Invalid sleep value: ${data.sleep}`);
    }

    // Convert to kg if needed
    const weightKg = weightUnit === "lbs" ? rawWeight * 0.453592 : rawWeight;

    // Create check-in record
    const checkIn = await prisma.checkIn.create({
        data: {
            clientId,
            weight: weightKg,
            energy: rawEnergy,
            sleep,
            notes,
        },
    });

    console.log(`[Flow] Created check-in ${checkIn.id} for client ${clientId}`);
    return checkIn;
}

/**
 * Process a workout log flow response
 */
export async function handleWorkoutLogFlowResponse(clientId: string, coachId: string, data: FlowResponse) {
    const status = data.status as "COMPLETED" | "MODIFIED" | "SKIPPED";
    const rpe = Number.parseInt(data.rpe, 10);
    const notes = data.notes || null;

    const assignment = await prisma.planAssignment.findFirst({
        where: { clientId, isActive: true, client: { coachId } },
    });

    if (!assignment) {
        console.log(`[Flow] No active assignment for client ${clientId}`);
        return null;
    }

    const dayNumber = Math.ceil(
        (Date.now() - assignment.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const { workoutLog } = await prisma.$transaction(async (tx) => {
        const log = await tx.workoutLog.create({
            data: {
                clientId,
                assignmentId: assignment.id,
                dayNumber,
                status,
                notes: notes ? `RPE: ${rpe} | ${notes} (via Flow)` : `RPE: ${rpe} (via Flow)`,
            },
        });

        const logCount = await tx.workoutLog.count({
            where: { assignmentId: assignment.id, client: { coachId } },
        });
        const newCompliance = Math.min(100, Math.round((logCount / Math.max(dayNumber, 1)) * 100));

        const updated = await tx.planAssignment.updateMany({
            where: { id: assignment.id, client: { coachId } },
            data: { compliance: newCompliance },
        });
        if (updated.count !== 1) {
            console.warn(`[Flow] planAssignment.updateMany affected ${updated.count} rows for assignment ${assignment.id}`);
        }

        return { workoutLog: log };
    });

    console.log(`[Flow] Created workout log ${workoutLog.id} for client ${clientId}`);
    return workoutLog;
}

// ═══════════════════════════════════════════════════════════════
// QUICK REPLY BUTTON HANDLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Resolves a Quick Reply button payload (e.g., "workout.daily:0") to an action string.
 * The payload format is `${templateId}:${buttonIndex}`.
 */
export function resolveButtonAction(payload: string): { templateId: string; buttonLabel: string } | null {
    const colonIdx = payload.lastIndexOf(":");
    if (colonIdx === -1) return null;

    const templateId = payload.slice(0, colonIdx);
    const buttonIndex = Number.parseInt(payload.slice(colonIdx + 1), 10);

    const def = (META_TEMPLATES as Record<string, { quickReplyButtons?: string[] }>)[templateId];
    if (!def?.quickReplyButtons?.[buttonIndex]) return null;

    return { templateId, buttonLabel: def.quickReplyButtons[buttonIndex] };
}

export async function handleWorkoutButtonReply(client: any, buttonLabel: string) {
    const statusMap: Record<string, WorkoutStatus> = {
        "Done": WorkoutStatus.COMPLETED,
        "Skipped": WorkoutStatus.SKIPPED,
        "Modified": WorkoutStatus.MODIFIED,
        "✅ Done": WorkoutStatus.COMPLETED,
        "⏭ Skipped": WorkoutStatus.SKIPPED,
        "🔄 Modified": WorkoutStatus.MODIFIED,
    };
    const status = statusMap[buttonLabel];
    if (!status) return;

    const assignment = await prisma.planAssignment.findFirst({
        where: { clientId: client.id, isActive: true, client: { coachId: client.coachId } },
    });
    if (!assignment) return;

    const dayNumber = differenceInDays(new Date(), assignment.startDate) + 1;

    const { newCompliance } = await prisma.$transaction(async (tx) => {
        await tx.workoutLog.create({
            data: {
                clientId: client.id,
                assignmentId: assignment.id,
                dayNumber,
                status,
                notes: `${buttonLabel} via WhatsApp button`,
            },
        });

        const count = await tx.workoutLog.count({
            where: { assignmentId: assignment.id, client: { coachId: client.coachId } },
        });
        const compliance = Math.min(100, Math.round((count / Math.max(dayNumber, 1)) * 100));

        const updated = await tx.planAssignment.updateMany({
            where: { id: assignment.id, client: { coachId: client.coachId } },
            data: { compliance },
        });
        if (updated.count !== 1) {
            console.warn(`[Webhook] planAssignment.updateMany affected ${updated.count} rows for assignment ${assignment.id}`);
        }

        return { newCompliance: compliance };
    });

    const channel = await getChannel(client.preferredChannel, client.coachId);
    const recipientId = getRecipientId(client);

    await channel.sendTemplate(recipientId, TemplateId.WORKOUT_LOGGED_CONFIRMATION, {
        client_first_name: client.name.split(" ")[0],
        workout_day_number: dayNumber,
        compliance: newCompliance,
    }, client.id);

    await logEvent(EventType.WORKOUT_COMPLETED, {
        coachId: client.coachId,
        clientId: client.id,
        channel: MessageChannel.WHATSAPP,
        metadata: { dayNumber, compliance: newCompliance, source: "whatsapp_button" },
    });
}

export async function handleMealButtonReply(client: any, buttonLabel: string) {
    const isCompleted = buttonLabel === "Done" || buttonLabel === "✅ Done";
    const isSkipped = buttonLabel === "Skipped" || buttonLabel === "⏭ Skipped";
    if (!isCompleted && !isSkipped) return;

    const mealAssignment = await prisma.mealAssignment.findFirst({
        where: { clientId: client.id, isActive: true, client: { coachId: client.coachId } },
    });
    if (!mealAssignment) return;

    const dayNumber = differenceInDays(new Date(), mealAssignment.startDate) + 1;

    await prisma.mealLog.create({
        data: {
            clientId: client.id,
            assignmentId: mealAssignment.id,
            dayNumber,
            status: isCompleted ? MealStatus.COMPLETED : MealStatus.SKIPPED,
            notes: `${buttonLabel} via WhatsApp button`,
        },
    });

    const totalLogs = await prisma.mealLog.count({
        where: { assignmentId: mealAssignment.id, client: { coachId: client.coachId } },
    });
    const completedLogs = await prisma.mealLog.count({
        where: { assignmentId: mealAssignment.id, status: "COMPLETED", client: { coachId: client.coachId } },
    });
    const compliance = totalLogs > 0 ? Math.round((completedLogs / totalLogs) * 100) : 100;

    const updated = await prisma.mealAssignment.updateMany({
        where: { id: mealAssignment.id, client: { coachId: client.coachId } },
        data: { compliance },
    });
    if (updated.count !== 1) {
        console.warn(`[Webhook] mealAssignment.updateMany affected ${updated.count} rows for assignment ${mealAssignment.id}`);
    }

    const channel = await getChannel(client.preferredChannel, client.coachId);
    const recipientId = getRecipientId(client);

    await channel.sendTemplate(recipientId, TemplateId.MEAL_LOGGED_CONFIRMATION, {
        day_number: dayNumber,
        client_first_name: client.name.split(" ")[0],
        compliance,
    }, client.id);
}

async function handleCheckinButtonReply(client: any) {
    const flowId = env.WA_CHECKIN_FLOW_ID;
    if (!flowId) {
        console.warn("[Webhook] WA_CHECKIN_FLOW_ID not set — cannot send check-in flow");
        return;
    }
    await sendCheckinFlow(client.phone, flowId, client.id);
}

async function routeButtonTap(client: any, payload: string, displayText: string, metaMessageId: string) {
    await prisma.message.create({
        data: {
            clientId: client.id,
            channel: MessageChannel.WHATSAPP,
            direction: MessageDirection.INBOUND,
            content: `[Button] ${displayText || payload}`,
            metaMessageId,
            status: "received",
        },
    });

    const action = resolveButtonAction(payload);
    if (!action) {
        console.warn(`[Webhook] Unknown button payload: ${payload}`);
        return;
    }

    console.log(`[Webhook] Button reply: ${action.templateId} → ${action.buttonLabel}`);

    if (action.templateId === TemplateId.WORKOUT_DAILY) {
        await handleWorkoutButtonReply(client, action.buttonLabel);
    } else if (action.templateId === TemplateId.MEAL_DAILY || action.templateId === TemplateId.MEAL_MISSED_NUDGE) {
        await handleMealButtonReply(client, action.buttonLabel);
    } else if (action.templateId === TemplateId.CHECKIN_WEEKLY_PROMPT || action.templateId === TemplateId.CHECKIN_MISSED_NUDGE) {
        await handleCheckinButtonReply(client);
    }
}

// GET /webhooks - Meta Webhook Verification
router.get("/", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token) {
        if (mode === "subscribe" && token === env.META_WHATSAPP_VERIFY_TOKEN) {
            console.log("[Webhook] Verified Meta Webhook");
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
});

// POST /webhooks - Receive Meta Webhook Events (WhatsApp)
router.post("/", async (req, res) => {
    // Verify Meta webhook signature before processing
    const rawBody = (req as any).rawBody;
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
        console.error("[Webhook] Missing rawBody — JSON body parser may not have run");
        res.sendStatus(500);
        return;
    }
    const appSecret = env.META_APP_SECRET;
    const signature = req.headers["x-hub-signature-256"];
    if (!appSecret || typeof signature !== "string" || !verifyMetaSignature(rawBody, signature, appSecret)) {
        console.warn("[Webhook] Invalid or missing Meta signature — rejecting.");
        res.sendStatus(403);
        return;
    }

    const body = req.body;

    console.log("[Webhook] Received Meta event:", JSON.stringify(summarizeMetaWebhookEvent(body)));

    res.sendStatus(200); // Always respond fast to Meta

    if (body.object === "whatsapp_business_account") {
        const changes = body.entry?.[0]?.changes?.[0]?.value;
        const messages = changes?.messages;
        const statuses = changes?.statuses;

        // ── Process delivery status callbacks ────────────────────
        if (statuses) {
            for (const status of statuses) {
                try {
                    const metaMessageId = status.id;
                    const statusValue: string = status.status; // sent | delivered | read | failed
                    const errorCodes: number[] = (status.errors ?? []).map((e: any) => e.code);
                    const errorTitles: string[] = (status.errors ?? []).map((e: any) => e.title);

                    // Update the Message record if it exists
                    // Webhook status callback: tenant resolved via metaMessageId
                    // (unique global ID issued by Meta, not user-supplied).
                    const message = metaMessageId
                        ? await prisma.message.findFirst({
                            where: { metaMessageId, __unsafeGlobal: true } as never,
                        })
                        : null;

                    if (message) {
                        await prisma.message.updateMany({
                            where: { metaMessageId, __unsafeGlobal: true } as never,
                            data: { status: statusValue },
                        });
                    }

                    // Log specific failure events
                    if (statusValue === "failed") {
                        const isWindowClosed = errorCodes.includes(MetaErrorCode.REENGAGEMENT_MESSAGE);

                        await logEvent(
                            isWindowClosed ? EventType.MESSAGE_WINDOW_CLOSED : EventType.MESSAGE_FAILED,
                            {
                                clientId: message?.clientId ?? undefined,
                                channel: MessageChannel.WHATSAPP,
                                metadata: {
                                    metaMessageId,
                                    recipientId: status.recipient_id,
                                    errorCodes,
                                    errorTitles,
                                },
                            },
                        );

                        console.warn(
                            `[Webhook] Message ${metaMessageId} failed:`,
                            isWindowClosed ? "24-hour window closed" : errorTitles.join(", "),
                        );
                    }
                } catch (statusError) {
                    console.error(`[Webhook] Error processing status ${status.id}:`, statusError);
                }
            }
        }

        // ── Process inbound messages ─────────────────────────────
        if (messages) {
            for (const msg of messages) {
                // Each message is processed independently so a failure on one doesn't
                // silently drop subsequent messages in the same batch (Meta sends 200 early).
                try {
                    // Webhook entry: resolve tenant from phone (Meta-authenticated via signature).
                    const client = await prisma.client.findFirst({
                        where: { phone: msg.from, __unsafeGlobal: true } as never,
                    });

                    if (!client) {
                        // Check if sender is a coach (for exercise commands via WhatsApp)
                        if (msg.type === "text" && msg.text?.body && /^\/(?:exercise|ex|send|workout)\b/i.test(msg.text.body.trim())) {
                            const coach = await prisma.coach.findFirst({
                                where: { clients: { some: { phone: msg.from } } },
                            });
                            if (!coach) {
                                console.log(`[Webhook] Unknown sender (not client or coach): ${redactPhone(msg.from)}`);
                                continue;
                            }
                            const response = await routeCoachCommand(coach.id, msg.text.body);
                            if (response) {
                                await sendWhatsAppMessage(msg.from, response);
                            }
                        } else {
                            console.log(`[Webhook] Unknown sender: ${redactPhone(msg.from)}`);
                        }
                        continue;
                    }

                    // Handle interactive button responses (ad-hoc interactive messages)
                    if (msg.type === "interactive" && msg.interactive?.type === "button_reply") {
                        const buttonReply = msg.interactive.button_reply;
                        await routeButtonTap(client, buttonReply.id || "", buttonReply.title || "", msg.id);
                        continue;
                    }

                    // Handle template Quick Reply button taps. Meta delivers these as
                    // msg.type === "button" with payload at msg.button.payload — distinct
                    // from the "interactive" / "button_reply" shape above.
                    if (msg.type === "button" && msg.button) {
                        const payload: string = msg.button.payload || "";
                        const text: string = msg.button.text || "";
                        await routeButtonTap(client, payload, text, msg.id);
                        continue;
                    }

                    // Check if this is a Flow response (nfm_reply)
                    if (msg.type === "interactive" && msg.interactive?.type === "nfm_reply") {
                        const nfmReply = msg.interactive?.nfm_reply;
                        if (!nfmReply?.response_json) {
                            console.error(`[Webhook] Missing nfm_reply or response_json for msg ${msg.id}`);
                            continue;
                        }
                        const flowToken = nfmReply.body || "";

                        let responseData: FlowResponse;
                        try {
                            responseData = JSON.parse(nfmReply.response_json);
                        } catch (parseErr) {
                            console.error(`[Webhook] Invalid JSON in nfm_reply for msg ${msg.id}:`, parseErr);
                            continue;
                        }
                        responseData.flow_token = flowToken;

                        console.log(`[Webhook] Flow response received: flow_token=${flowToken}, keys=${Object.keys(responseData).join(",")}`);

                        await prisma.message.create({
                            data: {
                                clientId: client.id,
                                channel: MessageChannel.WHATSAPP,
                                direction: MessageDirection.INBOUND,
                                content: `[Flow Response] ${JSON.stringify(responseData)}`,
                                metaMessageId: msg.id,
                                status: "received"
                            }
                        });

                        const KNOWN_FLOW_TYPES = new Set(["weekly_checkin", "workout_log"]);
                        const flowType = typeof responseData.flow_type === "string"
                            ? responseData.flow_type.slice(0, 50)
                            : undefined;

                        if (flowType === "weekly_checkin" || flowToken.startsWith("checkin_")) {
                            await handleCheckinFlowResponse(client.id, responseData);
                        } else if (flowType === "workout_log" || flowToken.startsWith("workout_")) {
                            await handleWorkoutLogFlowResponse(client.id, client.coachId, responseData);
                        } else if (flowType && !KNOWN_FLOW_TYPES.has(flowType)) {
                            console.log(`[Webhook] Unknown flow type: ${flowType}`);
                        }
                        continue;
                    }

                    // Regular text message
                    await prisma.message.create({
                        data: {
                            clientId: client.id,
                            channel: MessageChannel.WHATSAPP,
                            direction: MessageDirection.INBOUND,
                            content: msg.text?.body || JSON.stringify(msg),
                            metaMessageId: msg.id,
                            status: "received"
                        }
                    });

                    await messageQueue.add("process-message", {
                        clientId: client.id,
                        coachId: client.coachId,
                        body: msg.text?.body || "",
                        messageSid: msg.id,
                        channel: MessageChannel.WHATSAPP
                    });
                } catch (msgError) {
                    // Log and continue — don't let one bad message kill the entire batch.
                    console.error(`[Webhook] Error processing message ${msg.id} from ${redactPhone(msg.from)}:`, msgError);
                }
            }
        }
    }
});

export default router;
