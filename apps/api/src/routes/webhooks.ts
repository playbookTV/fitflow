import { Router } from "express";
import { MessageChannel, MessageDirection } from "@prisma/client";
import { workoutQueue } from "../lib/queue";
import { prisma } from "../lib/prisma";

const router: Router = Router();

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

                if (client) {
                    // Log message in DB
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
