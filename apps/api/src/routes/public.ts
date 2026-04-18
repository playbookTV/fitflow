import { Router } from "express";
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import { MessageChannel } from "@prisma/client";
import { logEvent, EventType } from "../lib/event-logger";
import { getChannel } from "../lib/channels/channel-router";
import { getSharedBotUsername } from "../lib/bot-provisioner";

const router: Router = Router();

const IP_HASH_SALT = process.env.IP_HASH_SALT || "ftfw-profile-salt";

function hashIp(ip: string): string {
    return createHash("sha256").update(ip + IP_HASH_SALT).digest("hex").slice(0, 16);
}

/**
 * GET /p/profile/:slug
 *
 * Public coach profile endpoint. Returns coach info, active offers, rates,
 * and channel availability for the ftfw.fit landing page.
 * Query params: ?c=wb|tg (for channel context)
 */
router.get("/profile/:slug", async (req, res) => {
    const { slug } = req.params;

    try {
        // 1. Check slug redirects (for changed slugs within 90-day window)
        const redirect = await prisma.slugRedirect.findUnique({
            where: { oldSlug: slug.toLowerCase() },
        });

        if (redirect && redirect.expiresAt > new Date()) {
            return res.json({ redirect: redirect.newSlug });
        }

        // Clean up expired redirect if found
        if (redirect?.expiresAt && redirect.expiresAt <= new Date()) {
            await prisma.slugRedirect.delete({ where: { id: redirect.id } }).catch(() => {});
        }

        // 2. Look up coach by slug
        const coach = await prisma.coach.findUnique({
            where: { slug: slug.toLowerCase() },
            select: {
                id: true,
                name: true,
                slug: true,
                businessName: true,
                bio: true,
                avatarUrl: true,
                specialities: true,
                profileVisible: true,
                showRatesPublicly: true,
                showWhatsapp: true,
                showTelegram: true,
                defaultPaymentModel: true,
                billingCurrency: true,
                defaultPricePerSession: true,
                defaultSessionsPerBlock: true,
                defaultMonthlyRate: true,
                offers: {
                    where: { isActive: true },
                    select: { id: true, name: true, slug: true, ctaType: true },
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        // Profile not found or hidden — same 404 for both (per spec)
        if (!coach || !coach.profileVisible) {
            return res.status(404).json({ error: "Profile not found" });
        }

        // 3. Build channel info
        const displayNumber = process.env.META_WHATSAPP_DISPLAY_NUMBER || null;
        const botUsername = getSharedBotUsername();

        const whatsappAvailable = coach.showWhatsapp && !!displayNumber;
        const telegramAvailable = coach.showTelegram && !!botUsername;

        const channels: Record<string, string> = {};
        if (whatsappAvailable) {
            channels.wb = `https://wa.me/${displayNumber.replaceAll(/\D/g, "")}`;
        }
        if (telegramAvailable && coach.slug) {
            channels.tg = `https://t.me/${botUsername}?start=${coach.slug}`;
        }

        // 4. Build rates (only if visible)
        let rates = null;
        if (coach.showRatesPublicly && coach.defaultPaymentModel) {
            rates = {
                paymentModel: coach.defaultPaymentModel,
                currency: coach.billingCurrency,
                pricePerSession: coach.defaultPricePerSession,
                sessionsPerBlock: coach.defaultSessionsPerBlock,
                monthlyRate: coach.defaultMonthlyRate,
            };
        }

        // 5. Log profile view (deduplicated by IP hash + slug within 1 hour)
        const clientIp = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim()
            || req.socket.remoteAddress || "unknown";
        const ipHash = hashIp(clientIp);

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentView = await prisma.profileEvent.findFirst({
            where: {
                coachSlug: coach.slug!,
                event: "viewed",
                ipHash,
                createdAt: { gte: oneHourAgo },
            },
        });

        if (!recentView) {
            await prisma.profileEvent.create({
                data: {
                    coachSlug: coach.slug!,
                    coachId: coach.id,
                    event: "viewed",
                    ipHash,
                    userAgent: req.headers["user-agent"] || null,
                },
            }).catch((err) => console.error("[ProfileEvent] Failed to log view:", err));
        }

        res.json({
            coach: {
                name: coach.name,
                slug: coach.slug,
                businessName: coach.businessName,
                bio: coach.bio,
                avatarUrl: coach.avatarUrl,
                specialities: coach.specialities.slice(0, 3),
            },
            rates,
            channels,
            offers: coach.offers,
        });
    } catch (error) {
        console.error("[GET /p/profile/:slug]", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * POST /p/profile/:slug/event
 *
 * Log a profile analytics event (channel_click, redirect, link_copied).
 * No authentication required.
 */
router.post("/profile/:slug/event", async (req, res) => {
    const { slug } = req.params;
    const { event, channel, source } = req.body;

    const validEvents = ["channel_click", "redirect", "link_copied"];
    if (!event || !validEvents.includes(event)) {
        return res.status(400).json({ error: "Invalid event type" });
    }

    try {
        const coach = await prisma.coach.findUnique({
            where: { slug: slug.toLowerCase() },
            select: { id: true, slug: true },
        });

        if (!coach) return res.status(404).json({ error: "Profile not found" });

        const clientIp = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim()
            || req.socket.remoteAddress || "unknown";
        const ipHash = hashIp(clientIp);

        await prisma.profileEvent.create({
            data: {
                coachSlug: coach.slug!,
                coachId: coach.id,
                event,
                channel: channel || null,
                source: source || null,
                ipHash,
                userAgent: req.headers["user-agent"] || null,
            },
        });

        res.json({ success: true });
    } catch (error) {
        console.error("[POST /p/profile/:slug/event]", error);
        res.status(500).json({ error: "Failed to log event" });
    }
});

/**
 * GET /p/:coachSlug/:offerSlug
 *
 * Public intake page data endpoint. Returns coach and offer info
 * for rendering the public-facing intake page.
 * Query params: ?ch=wa|tg&src=igbio|tiktok|...
 */
router.get("/:coachSlug/:offerSlug", async (req, res) => {
    const { coachSlug, offerSlug } = req.params;
    const channelParam = req.query.ch as string | undefined;
    const source = req.query.src as string | undefined;

    try {
        const coach = await prisma.coach.findUnique({
            where: { slug: coachSlug },
            select: { id: true, name: true, slug: true },
        });

        if (!coach) return res.status(404).json({ error: "Coach not found" });

        const offer = await prisma.offer.findFirst({
            where: { coachId: coach.id, slug: offerSlug, isActive: true },
        });

        if (!offer) return res.status(404).json({ error: "Offer not found" });

        // Determine channel: query param > offer default > WHATSAPP
        let channel: MessageChannel = MessageChannel.WHATSAPP;
        if (channelParam === "tg") channel = MessageChannel.TELEGRAM;
        else if (channelParam === "wa") channel = MessageChannel.WHATSAPP;
        else if (offer.channelParam) channel = offer.channelParam;

        res.json({
            coach: { name: coach.name, slug: coach.slug },
            offer: {
                id: offer.id,
                name: offer.name,
                slug: offer.slug,
                ctaType: offer.ctaType,
                paymentRoute: offer.paymentRoute,
            },
            channel,
            source: source || null,
        });
    } catch (error) {
        console.error("[GET /p/:coachSlug/:offerSlug]", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * POST /p/:coachSlug/:offerSlug/apply
 *
 * Public lead capture endpoint. Creates a lead record from the intake form.
 * No authentication required.
 */
router.post("/:coachSlug/:offerSlug/apply", async (req, res) => {
    const { coachSlug, offerSlug } = req.params;
    const { name, phone, email, telegramChatId, channel, source, intakeData } = req.body;

    if (!name) return res.status(400).json({ error: "Name is required" });

    try {
        const coach = await prisma.coach.findUnique({
            where: { slug: coachSlug },
        });

        if (!coach) return res.status(404).json({ error: "Coach not found" });

        const offer = await prisma.offer.findFirst({
            where: { coachId: coach.id, slug: offerSlug, isActive: true },
        });

        if (!offer) return res.status(404).json({ error: "Offer not found" });

        // Determine channel
        let channelTag: MessageChannel = MessageChannel.WHATSAPP;
        if (channel === "TELEGRAM" || channel === "tg") channelTag = MessageChannel.TELEGRAM;

        const intakeToken = randomUUID();
        const lead = await prisma.lead.create({
            data: {
                coachId: coach.id,
                offerId: offer.id,
                name,
                phone: phone || null,
                email: email || null,
                telegramChatId: telegramChatId || null,
                channelTag,
                source: source || null,
                intakeData: intakeData || null,
                intakeToken,
            },
        });

        await logEvent(EventType.LEAD_CREATED, {
            coachId: coach.id,
            channel: channelTag,
            metadata: {
                leadId: lead.id,
                offerId: offer.id,
                source: source || null,
            },
        });

        // Auto-send intake/onboarding message via the lead's preferred channel
        if (channelTag === MessageChannel.WHATSAPP && phone) {
            try {
                const adapter = await getChannel(MessageChannel.WHATSAPP, coach.id);
                const intakeUrl = `${process.env.WEB_URL}/onboarding?id=${lead.id}&token=${intakeToken}`;
                await adapter.sendOnboarding(phone, {
                    clientId: lead.id,
                    clientName: name,
                    intakeFormUrl: intakeUrl,
                });
            } catch (err) {
                console.error("[Lead Apply] Failed to auto-send WhatsApp onboarding:", err);
            }
        }

        res.status(201).json({
            success: true,
            leadId: lead.id,
            message: "Application received! Your coach will be in touch.",
        });
    } catch (error) {
        console.error("[POST /p/:coachSlug/:offerSlug/apply]", error);
        res.status(500).json({ error: "Failed to submit application" });
    }
});

export default router;
