import { Router } from "express";
import { prisma } from "../lib/prisma";
import { MessageChannel } from "@prisma/client";
import { logEvent, EventType } from "../lib/event-logger";

const router: Router = Router();

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
