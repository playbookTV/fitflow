import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { getSharedBotUsername } from "../lib/bot-provisioner";
import { createConnectAccount, createAccountLink, createLoginLink } from "../lib/stripe";

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
            phone: coach.phone,
            slug: coach.slug,
            businessName: coach.businessName,
            timezone: coach.timezone,
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

    const { name, slug, phone, businessName, timezone, defaultChannel } = req.body;

    try {
        const coach = await prisma.coach.update({
            where: { id: coachId },
            data: {
                ...(name !== undefined && { name }),
                ...(slug !== undefined && { slug }),
                ...(phone !== undefined && { phone }),
                ...(businessName !== undefined && { businessName }),
                ...(timezone !== undefined && { timezone }),
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

// POST /coaches/stripe/connect - Create or resume Stripe Express onboarding
router.post("/stripe/connect", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const coach = await prisma.coach.findUnique({ where: { id: coachId } });
        if (!coach) return res.status(404).json({ error: "Coach not found" });

        let accountId = coach.stripeAccountId;

        if (!accountId) {
            const account = await createConnectAccount(coachId, coach.email);
            accountId = account.id;
            await prisma.coach.update({
                where: { id: coachId },
                data: { stripeAccountId: accountId },
            });
        }

        const webUrl = process.env.WEB_URL || "http://localhost:3000";
        const accountLink = await createAccountLink(
            accountId,
            `${webUrl}/dashboard/settings?stripe=refresh`,
            `${webUrl}/dashboard/settings?stripe=success`
        );

        res.json({ url: accountLink.url });
    } catch (error: any) {
        console.error("[POST /coaches/stripe/connect]", error);

        if (error?.type === "StripeInvalidRequestError" && error?.message?.includes("signed up for Connect")) {
            return res.status(503).json({
                error: "Stripe Connect is not enabled on this platform account. Please contact support.",
                code: "STRIPE_CONNECT_NOT_ENABLED",
            });
        }

        res.status(500).json({ error: "Failed to initiate Stripe Connect" });
    }
});

// GET /coaches/stripe/dashboard - Get Stripe Express dashboard login link
router.get("/stripe/dashboard", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const coach = await prisma.coach.findUnique({
            where: { id: coachId },
            select: { stripeAccountId: true },
        });

        if (!coach?.stripeAccountId) {
            return res.status(400).json({ error: "Stripe account not connected" });
        }

        const loginLink = await createLoginLink(coach.stripeAccountId);
        res.json({ url: loginLink.url });
    } catch (error) {
        console.error("[GET /coaches/stripe/dashboard]", error);
        res.status(500).json({ error: "Failed to generate dashboard link" });
    }
});

export default router;
