import crypto from "node:crypto";
import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { enforceLimit } from "../middleware/subscription";
import { prisma } from "../lib/prisma";
import { onboardingQueue } from "../lib/queue";
import { JobType } from "../lib/types";
import { logEvent, EventType } from "../lib/event-logger";
import { validate } from "../middleware/validate";
import { createClientSchema, updateClientSchema } from "../lib/schemas";

const router: Router = Router();

// GET /clients - List all clients for the authenticated coach
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;

    if (!coachId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const clients = await prisma.client.findMany({
            where: { coachId },
            orderBy: { createdAt: "desc" },
        });
        res.json(clients);
    } catch (error) {
        console.error("[GET /clients]", error);
        res.status(500).json({ error: "Failed to fetch clients" });
    }
});

// POST /clients - Create a new client
router.post("/", authenticate, enforceLimit("clients"), validate(createClientSchema), async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { name, phone, email, goals, notes, preferredChannel, sessionBlock, monthlyRate, source } = req.body;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const result = await prisma.$transaction(async (tx) => {
            const client = await tx.client.create({
                data: {
                    coachId,
                    name,
                    phone,
                    email,
                    goals,
                    notes,
                    ...(preferredChannel && { preferredChannel }),
                    ...(monthlyRate !== undefined && { monthlyRate }),
                },
            });

            let createdBlock = null;
            if (sessionBlock) {
                createdBlock = await tx.sessionBlock.create({
                    data: {
                        clientId: client.id,
                        totalSessions: sessionBlock.totalSessions,
                        pricePerSession: sessionBlock.pricePerSession,
                    },
                });
            }

            return { client, sessionBlock: createdBlock };
        });

        await logEvent(EventType.CLIENT_CREATED, {
            coachId,
            clientId: result.client.id,
            channel: result.client.preferredChannel,
            metadata: source ? { source } : undefined,
        });

        if (source === "onboarding") {
            await logEvent(EventType.TRAINER_ACTIVATED, { coachId });
        }

        res.status(201).json(result);
    } catch (error) {
        console.error("[POST /clients]", error);
        res.status(500).json({ error: "Failed to create client" });
    }
});

// GET /clients/:id - Get single client details
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { id } = req.params;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const client = await prisma.client.findFirst({
            where: { id: id as string, coachId },
            include: {
                assignments: {
                    include: { plan: true },
                    orderBy: { startDate: "desc" },
                },
                checkIns: {
                    orderBy: { createdAt: "desc" },
                    take: 20,
                },
                workoutLogs: {
                    orderBy: { createdAt: "desc" },
                    take: 20,
                },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 10,
                }
            }
        });

        if (!client) return res.status(404).json({ error: "Client not found" });

        res.json(client);
    } catch (error) {
        console.error(`[GET /clients/${id}]`, error);
        res.status(500).json({ error: "Failed to fetch client" });
    }
});

// PATCH /clients/:id - Update client
router.patch("/:id", authenticate, validate(updateClientSchema), async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { id } = req.params;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const client = await prisma.client.update({
            where: { id: id as string, coachId },
            data: req.body,
        });
        res.json(client);
    } catch (error) {
        console.error(`[PATCH /clients/${id}]`, error);
        res.status(500).json({ error: "Failed to update client" });
    }
});

// POST /clients/:id/send-intake - Queue onboarding/intake message for a client
router.post("/:id/send-intake", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { id } = req.params;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const client = await prisma.client.findFirst({
            where: { id: id as string, coachId },
        });

        if (!client) return res.status(404).json({ error: "Client not found" });

        const intakeToken = crypto.randomUUID();
        await prisma.client.update({
            where: { id: client.id },
            data: { status: "INTAKE_SENT", intakeToken },
        });

        await onboardingQueue.add(JobType.ONBOARDING_INTAKE, {
            clientId: client.id,
            coachId,
            intakeToken,
        });

        res.json({ success: true });
    } catch (error) {
        console.error(`[POST /clients/${id}/send-intake]`, error);
        res.status(500).json({ error: "Failed to send intake" });
    }
});

export default router;
