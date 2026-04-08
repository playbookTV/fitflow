import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { logEvent, EventType } from "../lib/event-logger";

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
            include: { offer: { select: { name: true, slug: true } } },
            orderBy: { createdAt: "desc" },
            take,
            skip,
        });
        res.json(leads);
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

        // Create client from lead
        const client = await prisma.client.create({
            data: {
                coachId,
                name: lead.name,
                phone: lead.phone,
                email: lead.email,
                telegramChatId: lead.telegramChatId,
                preferredChannel: lead.channelTag,
                status: "PENDING_PAYMENT",
            },
        });

        // Mark lead as converted
        await prisma.lead.update({
            where: { id },
            data: { status: "CONVERTED" },
        });

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

export default router;
