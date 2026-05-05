import { Router, Response } from "express";
import { MessageChannel, MessageDirection } from "@prisma/client";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { logEvent, EventType } from "../lib/event-logger";
import { sendTelegramMessage } from "../lib/telegram";
import { getSharedBotToken } from "../lib/bot-provisioner";
import { convertLeadToClient, startIntakeFlow } from "../lib/telegram-intake";

const router: Router = Router();

// GET /leads - List leads for the coach
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    const { status } = req.query;
    const take = Math.min(Number(req.query.limit) || 50, 200);
    const skip = Number(req.query.offset) || 0;

    try {
        const leads = await prisma.lead.findMany({
            where: {
                coachId,
                ...(status ? { status: status as any } : {}),
            },
            include: {
                offer: { select: { name: true, slug: true } },
                _count: {
                    select: {
                        messages: {
                            where: { direction: MessageDirection.INBOUND, status: { not: "read" } },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take,
            skip,
        });

        const result = leads.map(({ _count, ...lead }) => ({
            ...lead,
            unreadCount: _count.messages,
        }));
        res.json(result);
    } catch (error) {
        console.error("[GET /leads]", error);
        res.status(500).json({ error: "Failed to fetch leads" });
    }
});

// GET /leads/:id - Get single lead
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const id = req.params.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const lead = await prisma.lead.findFirst({
            where: { id, coachId },
            include: { offer: true },
        });

        if (!lead) return res.status(404).json({ error: "Lead not found" });
        res.json(lead);
    } catch (error) {
        console.error(`[GET /leads/${id}]`, error);
        res.status(500).json({ error: "Failed to fetch lead" });
    }
});

// PATCH /leads/:id - Update lead status
router.patch("/:id", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const id = req.params.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    // Explicit allowlist — prevents mass-assignment of coachId, offerId, etc.
    const { status, notes } = req.body;
    const allowedData: Record<string, unknown> = {};
    if (status !== undefined) allowedData.status = status;
    if (notes !== undefined) allowedData.notes = notes;

    try {
        const result = await prisma.lead.updateMany({
            where: { id, coachId },
            data: allowedData,
        });

        if (result.count === 0) return res.status(404).json({ error: "Lead not found" });
        res.json({ success: true });
    } catch (error) {
        console.error(`[PATCH /leads/${id}]`, error);
        res.status(500).json({ error: "Failed to update lead" });
    }
});

// POST /leads/:id/convert - Convert a lead to a client
router.post("/:id/convert", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const id = req.params.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const lead = await prisma.lead.findFirst({
            where: { id, coachId },
        });

        if (!lead) return res.status(404).json({ error: "Lead not found" });
        if (lead.status === "CONVERTED") {
            return res.status(400).json({ error: "Lead already converted" });
        }

        const client = await convertLeadToClient(id, coachId);

        await logEvent(EventType.LEAD_CONVERTED, {
            coachId,
            clientId: client.id,
            channel: lead.channelTag,
            metadata: { leadId: id, source: lead.source },
        });

        res.status(201).json(client);
    } catch (error) {
        console.error(`[POST /leads/${id}/convert]`, error);
        res.status(500).json({ error: "Failed to convert lead" });
    }
});

// POST /leads/:id/start-intake - Coach triggers the intake questionnaire for a lead
router.post("/:id/start-intake", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const id = req.params.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const lead = await prisma.lead.findFirst({
            where: { id, coachId },
        });

        if (!lead) return res.status(404).json({ error: "Lead not found" });
        if (!lead.telegramChatId) return res.status(400).json({ error: "Lead has no Telegram chat" });
        if (lead.status === "CONVERTED") return res.status(400).json({ error: "Lead already converted" });

        const intake = lead.intakeData as any;
        if (intake?.step === "complete") {
            return res.status(400).json({ error: "Intake already completed" });
        }

        const botToken = getSharedBotToken();
        if (!botToken) return res.status(500).json({ error: "Bot not configured" });

        const coach = await prisma.coach.findUnique({ where: { id: coachId } });
        const coachName = coach?.name || "Your coach";

        await startIntakeFlow(lead, botToken, coachName);

        res.json({ success: true });
    } catch (error) {
        console.error(`[POST /leads/${id}/start-intake]`, error);
        res.status(500).json({ error: "Failed to start intake" });
    }
});

// GET /leads/:id/messages - Fetch messages for a lead
router.get("/:id/messages", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const leadId = req.params.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    const take = Math.min(Number(req.query.limit) || 50, 200);
    const skip = Number(req.query.offset) || 0;

    try {
        const lead = await prisma.lead.findFirst({ where: { id: leadId, coachId } });
        if (!lead) return res.status(404).json({ error: "Lead not found" });

        const messages = await prisma.message.findMany({
            where: { leadId, lead: { coachId } },
            orderBy: { createdAt: "asc" },
            take,
            skip,
        });

        res.json(messages);
    } catch (error) {
        console.error(`[GET /leads/${leadId}/messages]`, error);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});

// POST /leads/:id/messages - Send a message to a lead
router.post("/:id/messages", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const leadId = req.params.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Content required" });

    try {
        const lead = await prisma.lead.findFirst({ where: { id: leadId, coachId } });
        if (!lead) return res.status(404).json({ error: "Lead not found" });
        if (!lead.telegramChatId) return res.status(400).json({ error: "Lead has no Telegram chat" });

        const botToken = getSharedBotToken();
        if (!botToken) return res.status(500).json({ error: "Bot not configured" });

        const result = await sendTelegramMessage(botToken, lead.telegramChatId, content);

        const message = await prisma.message.create({
            data: {
                leadId,
                channel: MessageChannel.TELEGRAM,
                direction: MessageDirection.OUTBOUND,
                content,
                metaMessageId: `tg_${result.message_id}`,
                status: "sent",
            },
        });

        res.status(201).json(message);
    } catch (error) {
        console.error(`[POST /leads/${leadId}/messages]`, error);
        res.status(500).json({ error: "Failed to send message" });
    }
});

export default router;
