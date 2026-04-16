import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { MessageDirection } from "@prisma/client";
import { getChannel, getRecipientId } from "../lib/channels/channel-router";

const router: Router = Router();

// GET /messages/conversations - Summarized conversations for the authenticated coach
router.get("/conversations", authenticate, async (req: AuthRequest, res) => {
    const coachId = req.user?.id as string;

    try {
        const clients = await prisma.client.findMany({
            where: { coachId },
            include: {
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 50,
                },
            },
            orderBy: { updatedAt: "desc" },
        });

        const conversations = clients
            .filter((client) => client.messages.length > 0)
            .map((client) => {
                const latestMessage = client.messages[0];

                return {
                    id: client.id,
                    clientId: client.id,
                    clientName: client.name,
                    clientPhone: client.phone || client.telegramChatId || "Unknown",
                    channel: client.preferredChannel,
                    lastMessage: latestMessage?.content,
                    lastMessageAt: latestMessage?.createdAt,
                    unreadCount: client.messages.filter(
                        (message) => message.direction === "INBOUND" && message.status !== "read"
                    ).length,
                    messages: [...client.messages]
                        .reverse()
                        .map((message) => ({
                            id: message.id,
                            content: message.content,
                            direction: message.direction === "INBOUND" ? "inbound" : "outbound",
                            status: message.status || "sent",
                            createdAt: message.createdAt,
                        })),
                };
            });

        res.json(conversations);
    } catch (error) {
        console.error("[GET /messages/conversations]", error);
        res.status(500).json({ error: "Failed to fetch conversations" });
    }
});

// GET /messages/:clientId - Get conversation history
router.get("/:clientId", authenticate, async (req: AuthRequest, res) => {
    const coachId = req.user?.id as string;
    const { clientId } = req.params;

    try {
        // Verify client belongs to coach
        const client = await prisma.client.findFirst({
            where: { id: clientId as string, coachId }
        });

        if (!client) return res.status(404).json({ error: "Client not found" });

        const take = Math.min(Number(req.query.limit) || 50, 200);
        const skip = Number(req.query.offset) || 0;

        const messages = await prisma.message.findMany({
            where: { clientId: clientId as string },
            orderBy: { createdAt: "desc" },
            take,
            skip,
        });

        res.json(messages);
    } catch (error) {
        console.error("[GET /messages]", error);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});

// POST /messages/:clientId - Send a message to a client
router.post("/:clientId", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const clientId = req.params.clientId as string;
    const { content } = req.body;

    if (!content?.trim()) return res.status(400).json({ error: "Message content is required" });

    try {
        const client = await prisma.client.findFirst({
            where: { id: clientId, coachId },
        });

        if (!client) return res.status(404).json({ error: "Client not found" });

        const channel = await getChannel(client.preferredChannel, coachId);
        const recipientId = getRecipientId(client);

        // Send via adapter (don't pass clientId so meta.ts skips its own DB save)
        const result = await channel.sendMessage(recipientId, content);

        if (!result.success) {
            return res.status(502).json({ error: result.error || "Failed to send message" });
        }

        // Persist in DB (single source of truth for both WA and TG)
        const message = await prisma.message.create({
            data: {
                clientId,
                channel: client.preferredChannel,
                direction: MessageDirection.OUTBOUND,
                content,
                metaMessageId: result.messageId || `coach_${Date.now()}`,
                status: "sent",
            },
        });

        res.status(201).json({
            id: message.id,
            content: message.content,
            direction: "outbound",
            status: message.status,
            createdAt: message.createdAt,
        });
    } catch (error) {
        console.error("[POST /messages/:clientId]", error);
        res.status(500).json({ error: "Failed to send message" });
    }
});

export default router;
