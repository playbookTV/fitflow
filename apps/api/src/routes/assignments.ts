import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router: Router = Router();

// POST /clients/:id/assignments - Assign a plan to a client
router.post("/:id/assignments", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { id } = req.params; // clientId
    const { planId, startDate, scheduleDays } = req.body;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        // Verify client belongs to coach
        const client = await prisma.client.findFirst({
            where: { id: id as string, coachId },
        });

        if (!client) return res.status(404).json({ error: "Client not found" });

        // Verify plan belongs to coach — without this check a coach could assign
        // another coach's proprietary plan to their client.
        const plan = await prisma.workoutPlan.findFirst({
            where: { id: planId as string, coachId },
        });

        if (!plan) return res.status(404).json({ error: "Plan not found" });

        // Create assignment
        const assignment = await prisma.planAssignment.create({
            data: {
                clientId: id as string,
                planId: planId as string,
                startDate: new Date(startDate),
                scheduleDays,
                isActive: true,
            },
        });

        // Update client status
        await prisma.client.update({
            where: { id: id as string },
            data: { status: "PLAN_ASSIGNED" },
        });

        res.status(201).json(assignment);
    } catch (error) {
        console.error(`[POST /clients/${id}/assignments]`, error);
        res.status(500).json({ error: "Failed to assign plan" });
    }
});

// GET /clients/:id/assignments - List assignments for a client
router.get("/:id/assignments", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { id } = req.params;

    try {
        const assignments = await prisma.planAssignment.findMany({
            where: {
                clientId: id as string,
                client: { coachId }
            },
            include: { plan: true },
            orderBy: { startDate: "desc" },
        });
        res.json(assignments);
    } catch (error) {
        console.error(`[GET /clients/${id}/assignments]`, error);
        res.status(500).json({ error: "Failed to fetch assignments" });
    }
});

export default router;
