import { Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { sendWhatsAppMessage } from "../lib/meta";
import { PrismaClient } from "@prisma/client";
import { workoutQueue } from "../lib/queue";

const router: Router = Router();
const prisma = new PrismaClient();

// POST /whatsapp/send - Send a manual WhatsApp message to a client
router.post("/send", authenticate, async (req: AuthRequest, res) => {
    const trainerId = req.user?.id as string;
    const { clientId, message } = req.body;

    if (!trainerId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const client = await prisma.client.findFirst({
            where: { id: clientId, trainerId },
        });

        if (!client) return res.status(404).json({ error: "Client not found" });

        const result = await sendWhatsAppMessage(client.phone, message);
        res.json({ success: true, messageId: result.sid });
    } catch (error) {
        console.error("Error sending manual WhatsApp message:", error);
        res.status(500).json({ error: "Failed to send message" });
    }
});

// GET /whatsapp/webhook - Meta Webhook Verification
router.get("/webhook", (req, res) => {
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

// POST /whatsapp/webhook - Receive Meta Webhook Events
router.post("/webhook", async (req, res) => {
    // Meta sends multiple changes in one request
    const body = req.body;

    console.log("[Webhook] Received Meta event:", JSON.stringify(body, null, 2));

    if (body.object === "whatsapp_business_account") {
        res.sendStatus(200);

        // Simple processing logic (can be expanded to BullMQ)
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const messages = value?.messages;

        if (messages) {
            for (const msg of messages) {
                console.log(`[Webhook] New message from ${msg.from}: ${msg.text?.body}`);

                // Identify client
                const client = await prisma.client.findFirst({
                    where: { phone: { contains: msg.from } }
                });

                if (client) {
                    await workoutQueue.add("process-message", {
                        clientId: client.id,
                        trainerId: client.trainerId,
                        body: msg.text?.body || "",
                        messageSid: msg.id
                    });
                } else {
                    console.log(`[Webhook] Sender not found in database: ${msg.from}`);
                }
            }
        }
    } else {
        res.sendStatus(404);
    }
});

export default router;
