import { Router } from "express";
import { MessageChannel, MessageDirection } from "@prisma/client";
import { workoutQueue } from "../lib/queue";
import { prisma } from "../lib/prisma";

const router: Router = Router();

// ═══════════════════════════════════════════════════════════════
// FLOW RESPONSE HANDLERS
// ═══════════════════════════════════════════════════════════════

interface FlowResponse {
    flow_token: string;
    flow_type?: string;
    [key: string]: any;
}

/**
 * Process a weekly check-in flow response
 */
async function handleCheckinFlowResponse(clientId: string, data: FlowResponse) {
    const weight = Number.parseFloat(data.weight);
    const weightUnit = data.weight_unit;
    const energy = Number.parseInt(data.energy, 10);
    const sleep = data.sleep;
    const notes = data.notes || null;

    // Convert to kg if needed
    const weightKg = weightUnit === "lbs" ? weight * 0.453592 : weight;

    // Create check-in record
    const checkIn = await prisma.checkIn.create({
        data: {
            clientId,
            weight: weightKg,
            energy,
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

    // Create workout log
    const workoutLog = await prisma.workoutLog.create({
        data: {
            clientId,
            assignmentId: assignment.id,
            dayNumber,
            status,
            notes: notes ? `RPE: ${rpe} | ${notes} (via Flow)` : `RPE: ${rpe} (via Flow)`,
        },
    });

    // Update compliance
    const logCount = await prisma.workoutLog.count({
        where: { assignmentId: assignment.id },
    });
    const newCompliance = Math.min(100, logCount * 10);

    await prisma.planAssignment.update({
        where: { id: assignment.id },
        data: { compliance: newCompliance },
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

// POST /webhooks - Receive Meta Webhook Events (WA + IG)
router.post("/", async (req, res) => {
    const body = req.body;

    // Log the incoming event for debugging
    console.log("[Webhook] Received Meta event:", JSON.stringify(body, null, 2));

    res.sendStatus(200); // Always respond fast to Meta

    // 1. Handle WhatsApp Events
    if (body.object === "whatsapp_business_account") {
        const changes = body.entry?.[0]?.changes?.[0]?.value;
        const messages = changes?.messages;

        if (messages) {
            for (const msg of messages) {
                // Find or identify client by phone
                const client = await prisma.client.findFirst({
                    where: { phone: { contains: msg.from } }
                });

                if (!client) {
                    console.log(`[Webhook] Unknown sender: ${msg.from}`);
                    continue;
                }

                // Check if this is a Flow response (nfm_reply)
                if (msg.type === "interactive" && msg.interactive?.type === "nfm_reply") {
                    const nfmReply = msg.interactive.nfm_reply;
                    const flowToken = nfmReply.body || "";

                    try {
                        const responseData: FlowResponse = JSON.parse(nfmReply.response_json);
                        responseData.flow_token = flowToken;

                        console.log(`[Webhook] Flow response received:`, responseData);

                        // Log message in DB
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

                        // Route to appropriate handler based on flow_type or flow_token prefix
                        if (responseData.flow_type === "weekly_checkin" || flowToken.startsWith("checkin_")) {
                            await handleCheckinFlowResponse(client.id, responseData);
                        } else if (responseData.flow_type === "workout_log" || flowToken.startsWith("workout_")) {
                            await handleWorkoutLogFlowResponse(client.id, responseData);
                        } else {
                            console.log(`[Webhook] Unknown flow type: ${responseData.flow_type}`);
                        }
                    } catch (error) {
                        console.error("[Webhook] Error parsing Flow response:", error);
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

                // Add to queue for processing logic
                await workoutQueue.add("process-message", {
                    clientId: client.id,
                    trainerId: client.trainerId,
                    body: msg.text?.body || "",
                    messageSid: msg.id,
                    channel: MessageChannel.WHATSAPP
                });
            }
        }
    }

    // 2. Handle Instagram Events
    if (body.object === "instagram") {
        const entry = body.entry?.[0];
        const messaging = entry?.messaging;

        if (messaging) {
            for (const event of messaging) {
                const senderId = event.sender.id;
                const message = event.message;

                if (message) {
                    // Skip echos (messages sent by the business/app)
                    if (message.is_echo) continue;

                    // Find client by instagramId
                    let client = await prisma.client.findUnique({
                        where: { instagramId: senderId }
                    });

                    // If not found, check if it's a new lead (onboarding automator will handle)
                    if (client) {
                        // Log message in DB
                        await prisma.message.create({
                            data: {
                                clientId: client.id,
                                channel: MessageChannel.INSTAGRAM,
                                direction: MessageDirection.INBOUND,
                                content: message.text || JSON.stringify(message),
                                metaMessageId: message.mid,
                                status: "received"
                            }
                        });

                        // Add to queue
                        await workoutQueue.add("process-message", {
                            clientId: client.id,
                            trainerId: client.trainerId,
                            body: message.text || "",
                            messageSid: message.mid,
                            channel: MessageChannel.INSTAGRAM
                        });
                    } else {
                        // NEW LEAD via Instagram
                        console.log(`[Webhook] New Instagram Lead: ${senderId}`);
                        // Handle "SHRED" keyword or general intake
                        if (message.text?.toUpperCase().includes("SHRED")) {
                            await workoutQueue.add("handle-new-lead", {
                                instagramId: senderId,
                                text: message.text,
                                channel: MessageChannel.INSTAGRAM
                            });
                        }
                    }
                }
            }
        }
    }
});

export default router;
