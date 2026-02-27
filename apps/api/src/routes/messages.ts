import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router: Router = Router();

// GET /messages/:clientId - Get conversation history
router.get("/:clientId", authenticate, async (req: AuthRequest, res) => {
    const trainerId = req.user?.id as string;
    const { clientId } = req.params;

    try {
        // Verify client belongs to trainer
        const client = await prisma.client.findFirst({
            where: { id: clientId as string, trainerId }
        });

        if (!client) return res.status(404).json({ error: "Client not found" });

        const messages = await prisma.message.findMany({
            where: { clientId: clientId as string },
            orderBy: { createdAt: "desc" },
            take: 50
        });

        res.json(messages);
    } catch (error) {
        console.error("[GET /messages]", error);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});

export default router;
