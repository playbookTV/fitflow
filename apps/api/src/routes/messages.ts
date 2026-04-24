import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { MessageDirection } from "@prisma/client";
import { getChannel, getRecipientId } from "../lib/channels/channel-router";
import { getWindowStatus } from "../lib/channels/window-check";

const router: Router = Router();

// GET /messages/conversations - Summarized conversations for the authenticated coach
router.get("/conversations", authenticate, async (req: AuthRequest, res) => {
    const coachId = req.user?.id as string;

    try {
        const clients = await prisma.client.findMany({
            where: { coachId, conversationArchived: false },
            include: {
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 50,
                },
            },
            orderBy: [
                { conversationPinned: "desc" },
                { updatedAt: "desc" },
            ],
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
                    pinned: client.conversationPinned,
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

        // Pass clientId so the adapter can run the 24-hour window pre-check
        const result = await channel.sendMessage(recipientId, content, client.id);

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

// GET /messages/:clientId/window-status - WhatsApp 24-hour window status
router.get("/:clientId/window-status", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const clientId = req.params.clientId as string;

    try {
        const client = await prisma.client.findFirst({
            where: { id: clientId, coachId },
            select: { preferredChannel: true },
        });

        if (!client) return res.status(404).json({ error: "Client not found" });

        // Telegram has no messaging window restrictions
        if (client.preferredChannel === "TELEGRAM") {
            return res.json({
                channel: "TELEGRAM",
                windowOpen: true,
                windowExpiresAt: null,
                canSendFreeText: true,
                canSendMarketingTemplate: true,
            });
        }

        const status = await getWindowStatus(clientId);

        res.json({
            channel: "WHATSAPP",
            windowOpen: status.isOpen,
            windowExpiresAt: status.expiresAt?.toISOString() ?? null,
            canSendFreeText: status.isOpen,
            canSendMarketingTemplate: true,
        });
    } catch (error) {
        console.error("[GET /messages/:clientId/window-status]", error);
        res.status(500).json({ error: "Failed to fetch window status" });
    }
});

// PATCH /messages/:clientId/pin - Toggle pin on a conversation
router.patch("/:clientId/pin", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const clientId = req.params.clientId as string;

    try {
        const client = await prisma.client.findFirst({
            where: { id: clientId, coachId },
        });
        if (!client) return res.status(404).json({ error: "Client not found" });

        const updated = await prisma.client.update({
            where: { id: clientId },
            data: { conversationPinned: !client.conversationPinned },
        });

        res.json({ pinned: updated.conversationPinned });
    } catch (error) {
        console.error("[PATCH /messages/:clientId/pin]", error);
        res.status(500).json({ error: "Failed to update pin status" });
    }
});

// PATCH /messages/:clientId/archive - Toggle archive on a conversation
router.patch("/:clientId/archive", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const clientId = req.params.clientId as string;

    try {
        const client = await prisma.client.findFirst({
            where: { id: clientId, coachId },
        });
        if (!client) return res.status(404).json({ error: "Client not found" });

        const updated = await prisma.client.update({
            where: { id: clientId },
            data: { conversationArchived: !client.conversationArchived },
        });

        res.json({ archived: updated.conversationArchived });
    } catch (error) {
        console.error("[PATCH /messages/:clientId/archive]", error);
        res.status(500).json({ error: "Failed to update archive status" });
    }
});

// DELETE /messages/:clientId - Delete all messages in a conversation
router.delete("/:clientId", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const clientId = req.params.clientId as string;

    try {
        const client = await prisma.client.findFirst({
            where: { id: clientId, coachId },
        });
        if (!client) return res.status(404).json({ error: "Client not found" });

        await prisma.message.deleteMany({
            where: { clientId },
        });

        res.json({ deleted: true });
    } catch (error) {
        console.error("[DELETE /messages/:clientId]", error);
        res.status(500).json({ error: "Failed to delete conversation" });
    }
});

export default router;
