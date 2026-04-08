import { Router } from "express";
import { MessageChannel, MessageDirection } from "@prisma/client";
import { messageQueue } from "../lib/queue";
import { prisma } from "../lib/prisma";
import { routeCoachCommand } from "../handlers/coachCommandRouter";
import { sendWhatsAppMessage } from "../lib/meta";

const router: Router = Router();

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
async function handleWorkoutLogFlowResponse(clientId: string, data: FlowResponse) {
    const status = data.status as "COMPLETED" | "MODIFIED" | "SKIPPED";
    const rpe = Number.parseInt(data.rpe, 10);
    const notes = data.notes || null;

    // Find active assignment
    const assignment = await prisma.planAssignment.findFirst({
        where: { clientId, isActive: true },
    });

    if (!assignment) {
        console.log(`[Flow] No active assignment for client ${clientId}`);
        return null;
    }

    // Calculate day number
    const dayNumber = Math.ceil(
        (Date.now() - assignment.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Create workout log and update compliance atomically to prevent TOCTOU races.
    // Compliance is expressed as a real percentage (logs / dayNumber * 100).
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

        const logCount = await tx.workoutLog.count({ where: { assignmentId: assignment.id } });
        const newCompliance = Math.min(100, Math.round((logCount / Math.max(dayNumber, 1)) * 100));

        await tx.planAssignment.update({
            where: { id: assignment.id },
            data: { compliance: newCompliance },
        });

        return { workoutLog: log };
    });

    console.log(`[Flow] Created workout log ${workoutLog.id} for client ${clientId}`);
    return workoutLog;
}

// GET /webhooks - Meta Webhook Verification
router.get("/", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token) {
        if (mode === "subscribe" && token === process.env.META_WHATSAPP_VERIFY_TOKEN) {
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
    const body = req.body;

    console.log("[Webhook] Received Meta event:", JSON.stringify(summarizeMetaWebhookEvent(body)));

    res.sendStatus(200); // Always respond fast to Meta

    if (body.object === "whatsapp_business_account") {
        const changes = body.entry?.[0]?.changes?.[0]?.value;
        const messages = changes?.messages;

        if (messages) {
            for (const msg of messages) {
                // Each message is processed independently so a failure on one doesn't
                // silently drop subsequent messages in the same batch (Meta sends 200 early).
                try {
                    // Find or identify client by phone (exact match to avoid substring collisions)
                    const client = await prisma.client.findFirst({
                        where: { phone: msg.from }
                    });

                    if (!client) {
                        // Check if sender is a coach (for exercise commands via WhatsApp)
                        if (msg.type === "text" && msg.text?.body && /^\/(?:exercise|ex|send|workout)\b/i.test(msg.text.body.trim())) {
                            const coach = await prisma.coach.findFirst({
                                where: { clients: { some: { phone: msg.from } } },
                            });
                            if (!coach) {
                                console.log(`[Webhook] Unknown sender (not client or coach): ${msg.from}`);
                                continue;
                            }
                            const response = await routeCoachCommand(coach.id, msg.text.body);
                            if (response) {
                                await sendWhatsAppMessage(msg.from, response);
                            }
                        } else {
                            console.log(`[Webhook] Unknown sender: ${msg.from}`);
                        }
                        continue;
                    }

                    // Check if this is a Flow response (nfm_reply)
                    if (msg.type === "interactive" && msg.interactive?.type === "nfm_reply") {
                        const nfmReply = msg.interactive.nfm_reply;
                        const flowToken = nfmReply.body || "";

                        const responseData: FlowResponse = JSON.parse(nfmReply.response_json);
                        responseData.flow_token = flowToken;

                        console.log(`[Webhook] Flow response received:`, responseData);

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

                        if (responseData.flow_type === "weekly_checkin" || flowToken.startsWith("checkin_")) {
                            await handleCheckinFlowResponse(client.id, responseData);
                        } else if (responseData.flow_type === "workout_log" || flowToken.startsWith("workout_")) {
                            await handleWorkoutLogFlowResponse(client.id, responseData);
                        } else {
                            console.log(`[Webhook] Unknown flow type: ${responseData.flow_type}`);
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
                    console.error(`[Webhook] Error processing message ${msg.id} from ${msg.from}:`, msgError);
                }
            }
        }
    }
});

export default router;
