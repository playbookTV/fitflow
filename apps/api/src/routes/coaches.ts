import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { getSharedBotUsername } from "../lib/bot-provisioner";
import { createConnectAccount, createAccountLink, createLoginLink } from "../lib/stripe";
import { logEvent, EventType } from "../lib/event-logger";

const router: Router = Router();

const RESERVED_SLUGS = new Set([
    "app", "api", "admin", "login", "register", "settings", "help",
    "404", "health", "status", "dashboard", "setup", "go", "onboarding", "t",
]);

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
            specialities: coach.specialities,
            defaultPaymentModel: coach.defaultPaymentModel,
            activeClientRange: coach.activeClientRange,
            onboardingCompleted: coach.onboardingCompleted,
            onboardingStep: coach.onboardingStep,
            bio: coach.bio,
            avatarUrl: coach.avatarUrl,
            profileVisible: coach.profileVisible,
            showRatesPublicly: coach.showRatesPublicly,
            showWhatsapp: coach.showWhatsapp,
            showTelegram: coach.showTelegram,
            defaultPricePerSession: coach.defaultPricePerSession,
            defaultSessionsPerBlock: coach.defaultSessionsPerBlock,
            defaultMonthlyRate: coach.defaultMonthlyRate,
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

    const {
        name, slug, phone, businessName, timezone, defaultChannel,
        specialities, defaultPaymentModel, activeClientRange,
        onboardingStep, onboardingCompleted,
        bio, avatarUrl, profileVisible, showRatesPublicly,
        showWhatsapp, showTelegram,
        defaultPricePerSession, defaultSessionsPerBlock, defaultMonthlyRate,
    } = req.body;

    // Validate reserved slugs
    if (slug !== undefined) {
        const normalized = slug.toLowerCase().replaceAll(/[^a-z0-9-]/g, "");
        if (RESERVED_SLUGS.has(normalized)) {
            return res.status(400).json({ error: "This slug is reserved and cannot be used" });
        }
        if (normalized.length < 3 || normalized.length > 30) {
            return res.status(400).json({ error: "Slug must be 3–30 characters" });
        }
    }

    // Validate bio length
    if (bio !== undefined && bio !== null && bio.length > 200) {
        return res.status(400).json({ error: "Bio must be 200 characters or fewer" });
    }

    try {
        // Check if slug is changing — create redirect from old slug
        if (slug !== undefined) {
            const current = await prisma.coach.findUnique({
                where: { id: coachId },
                select: { slug: true },
            });

            if (current?.slug && current.slug !== slug) {
                // Upsert: if old slug redirect already exists, update it
                await prisma.slugRedirect.upsert({
                    where: { oldSlug: current.slug },
                    update: {
                        newSlug: slug,
                        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                    },
                    create: {
                        oldSlug: current.slug,
                        newSlug: slug,
                        coachId,
                        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                    },
                });
            }
        }

        const coach = await prisma.coach.update({
            where: { id: coachId },
            data: {
                ...(name !== undefined && { name }),
                ...(slug !== undefined && { slug }),
                ...(phone !== undefined && { phone }),
                ...(businessName !== undefined && { businessName }),
                ...(timezone !== undefined && { timezone }),
                ...(defaultChannel !== undefined && { defaultChannel }),
                ...(specialities !== undefined && { specialities }),
                ...(defaultPaymentModel !== undefined && { defaultPaymentModel }),
                ...(activeClientRange !== undefined && { activeClientRange }),
                ...(onboardingStep !== undefined && { onboardingStep }),
                ...(onboardingCompleted !== undefined && { onboardingCompleted }),
                ...(bio !== undefined && { bio }),
                ...(avatarUrl !== undefined && { avatarUrl }),
                ...(profileVisible !== undefined && { profileVisible }),
                ...(showRatesPublicly !== undefined && { showRatesPublicly }),
                ...(showWhatsapp !== undefined && { showWhatsapp }),
                ...(showTelegram !== undefined && { showTelegram }),
                ...(defaultPricePerSession !== undefined && { defaultPricePerSession }),
                ...(defaultSessionsPerBlock !== undefined && { defaultSessionsPerBlock }),
                ...(defaultMonthlyRate !== undefined && { defaultMonthlyRate }),
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

// POST /coaches/onboarding/complete - Mark onboarding as done
router.post("/onboarding/complete", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const coach = await prisma.coach.update({
            where: { id: coachId },
            data: {
                onboardingCompleted: true,
                onboardingStep: 5,
            },
        });

        await logEvent(EventType.COACH_ONBOARDING_COMPLETED, { coachId });

        res.json({ success: true, coach });
    } catch (error) {
        console.error("[POST /coaches/onboarding/complete]", error);
        res.status(500).json({ error: "Failed to complete onboarding" });
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

        const displayNumber = process.env.META_WHATSAPP_DISPLAY_NUMBER || null;
        const waLink = displayNumber
            ? `https://wa.me/${displayNumber.replaceAll(/\D/g, "")}`
            : null;

        res.json({
            whatsapp: {
                connected: !!displayNumber,
                phoneNumber: displayNumber,
                waLink,
            },
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
