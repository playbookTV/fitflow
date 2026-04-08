import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

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

export default router;
