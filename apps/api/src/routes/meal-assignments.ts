import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { logEvent, EventType } from "../lib/event-logger";

const router: Router = Router();

// POST /clients/:id/meal-assignments — assign a meal plan to a client
router.post("/:id/meal-assignments", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const clientId = req.params.id as string;
    const { planId, startDate, scheduleDays } = req.body;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });
    if (!planId || !startDate || !Array.isArray(scheduleDays)) {
        return res.status(400).json({ error: "planId, startDate, and scheduleDays are required" });
    }

    try {
        const client = await prisma.client.findFirst({ where: { id: clientId, coachId } });
        if (!client) return res.status(404).json({ error: "Client not found" });

        const plan = await prisma.mealPlan.findFirst({ where: { id: planId, coachId } });
        if (!plan) return res.status(404).json({ error: "Meal plan not found" });

        // Deactivate any existing active meal assignment
        await prisma.mealAssignment.updateMany({
            where: { clientId, isActive: true },
            data: { isActive: false },
        });

        const assignment = await prisma.mealAssignment.create({
            data: {
                clientId,
                planId,
                startDate: new Date(startDate),
                scheduleDays,
                isActive: true,
            },
            include: { plan: true },
        });

        await logEvent(EventType.MEAL_PLAN_ASSIGNED, {
            coachId,
            clientId,
            metadata: { planId, planTitle: plan.title },
        });

        res.status(201).json(assignment);
    } catch (error) {
        console.error("[POST /clients/:id/meal-assignments]", error);
        res.status(500).json({ error: "Failed to assign meal plan" });
    }
});

// GET /clients/:id/meal-assignments — list client's meal assignments
router.get("/:id/meal-assignments", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const clientId = req.params.id as string;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const client = await prisma.client.findFirst({ where: { id: clientId, coachId } });
        if (!client) return res.status(404).json({ error: "Client not found" });

        const assignments = await prisma.mealAssignment.findMany({
            where: { clientId },
            include: {
                plan: { include: { days: { include: { entries: { include: { meal: true } } } } } },
                mealLogs: { orderBy: { createdAt: "desc" }, take: 7 },
            },
            orderBy: { startDate: "desc" },
        });

        res.json(assignments);
    } catch (error) {
        console.error("[GET /clients/:id/meal-assignments]", error);
        res.status(500).json({ error: "Failed to fetch meal assignments" });
    }
});

// PATCH /clients/:id/meal-assignments/:assignmentId — update assignment
router.patch("/:id/meal-assignments/:assignmentId", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const clientId = req.params.id as string;
    const assignmentId = req.params.assignmentId as string;
    const { isActive, scheduleDays } = req.body;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const client = await prisma.client.findFirst({ where: { id: clientId, coachId } });
        if (!client) return res.status(404).json({ error: "Client not found" });

        const assignment = await prisma.mealAssignment.update({
            where: { id: assignmentId },
            data: {
                ...(isActive !== undefined && { isActive }),
                ...(scheduleDays !== undefined && { scheduleDays }),
            },
            include: { plan: true },
        });

        res.json(assignment);
    } catch (error) {
        console.error("[PATCH /clients/:id/meal-assignments/:assignmentId]", error);
        res.status(500).json({ error: "Failed to update meal assignment" });
    }
});

export default router;
