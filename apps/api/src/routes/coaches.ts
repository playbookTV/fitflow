import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { provisionBot, deprovisionBot } from "../lib/bot-provisioner";

const router: Router = Router();

// GET /coaches/me - Get current coach profile
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const coach = await prisma.coach.findUnique({
            where: { id: coachId },
            include: { botRegistry: true },
        });

        if (!coach) return res.status(404).json({ error: "Coach not found" });

        res.json({
            id: coach.id,
            name: coach.name,
            email: coach.email,
            slug: coach.slug,
            defaultChannel: coach.defaultChannel,
            stripeConnected: !!coach.stripeAccountId,
            whatsappConnected: true, // Managed at platform level for now
            telegramConnected: !!coach.botRegistry,
            telegramBotUsername: coach.botRegistry?.botUsername || null,
        });
    } catch (error) {
        console.error("[GET /coaches/me]", error);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});

// PATCH /coaches/me - Update coach profile
router.patch("/me", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    // Note: phone, businessName and timezone are not yet columns on the Coach model.
    // Only persist fields that actually exist in the schema.
    const { name, slug, defaultChannel } = req.body;

    try {
        const coach = await prisma.coach.update({
            where: { id: coachId },
            data: {
                ...(name !== undefined && { name }),
                ...(slug !== undefined && { slug }),
                ...(defaultChannel !== undefined && { defaultChannel }),
            },
        });

        res.json(coach);
    } catch (error: any) {
        if (error.code === "P2002") {
            return res.status(409).json({ error: "Slug is already taken" });
        }
        console.error("[PATCH /coaches/me]", error);
        res.status(500).json({ error: "Failed to update profile" });
    }
});

// GET /coaches/channels - Get connected channel status
router.get("/channels", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const botRegistry = await prisma.botRegistry.findUnique({ where: { coachId } });

        res.json({
            whatsapp: { connected: true }, // Managed at platform level
            telegram: {
                connected: !!botRegistry,
                botUsername: botRegistry?.botUsername || null,
                provisionedAt: botRegistry?.provisionedAt || null,
            },
        });
    } catch (error) {
        console.error("[GET /coaches/channels]", error);
        res.status(500).json({ error: "Failed to fetch channels" });
    }
});

// POST /coaches/provision-telegram - Provision a Telegram bot
router.post("/provision-telegram", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    const { botToken } = req.body;
    if (!botToken) return res.status(400).json({ error: "botToken is required" });

    try {
        const result = await provisionBot(coachId, botToken);
        res.json({
            success: true,
            botUsername: result.botUsername,
            webhookUrl: result.webhookUrl,
        });
    } catch (error: any) {
        console.error("[POST /coaches/provision-telegram]", error);
        res.status(500).json({ error: error.message || "Failed to provision bot" });
    }
});

// DELETE /coaches/deprovision-telegram - Remove Telegram bot
router.delete("/deprovision-telegram", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        await deprovisionBot(coachId);
        res.json({ success: true });
    } catch (error: any) {
        console.error("[DELETE /coaches/deprovision-telegram]", error);
        res.status(500).json({ error: error.message || "Failed to deprovision bot" });
    }
});

export default router;
