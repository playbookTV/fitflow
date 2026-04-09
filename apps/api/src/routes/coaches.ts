import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { getSharedBotUsername } from "../lib/bot-provisioner";

const router: Router = Router();

// GET /coaches/me - Get current coach profile
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const coach = await prisma.coach.findUnique({
            where: { id: coachId },
        });

        if (!coach) return res.status(404).json({ error: "Coach not found" });

        const botUsername = getSharedBotUsername();
        const telegramDeepLink = botUsername && coach.slug
            ? `https://t.me/${botUsername}?start=${coach.slug}`
            : null;

        res.json({
            id: coach.id,
            name: coach.name,
            email: coach.email,
            slug: coach.slug,
            defaultChannel: coach.defaultChannel,
            stripeConnected: !!coach.stripeAccountId,
            whatsappConnected: true, // Managed at platform level for now
            telegramConnected: !!botUsername,
            telegramBotUsername: botUsername,
            telegramDeepLink,
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
        const botUsername = getSharedBotUsername();
        const coach = await prisma.coach.findUnique({
            where: { id: coachId },
            select: { slug: true },
        });

        const telegramDeepLink = botUsername && coach?.slug
            ? `https://t.me/${botUsername}?start=${coach.slug}`
            : null;

        res.json({
            whatsapp: { connected: true }, // Managed at platform level
            telegram: {
                connected: !!botUsername,
                botUsername: botUsername || null,
                deepLink: telegramDeepLink,
            },
        });
    } catch (error) {
        console.error("[GET /coaches/channels]", error);
        res.status(500).json({ error: "Failed to fetch channels" });
    }
});

export default router;
