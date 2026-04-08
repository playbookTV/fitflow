import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router: Router = Router();

// GET /plans - List plans for the coach
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    const take = Math.min(Number(req.query.limit) || 50, 200);
    const skip = Number(req.query.offset) || 0;

    try {
        const plans = await prisma.workoutPlan.findMany({
            where: { coachId },
            include: {
                days: { include: { exercises: { include: { exercise: true } } } },
                _count: { select: { assignments: true } },
            },
            orderBy: { createdAt: "desc" },
            take,
            skip,
        });
        res.json(plans.map((plan) => ({
            ...plan,
            daysPerWeek: plan.days.length,
        })));
    } catch (error) {
        console.error("[GET /plans]", error);
        res.status(500).json({ error: "Failed to fetch plans" });
    }
});

// POST /plans - Create a new plan
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { title, description, isTemplate, days } = req.body;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });
    if (!Array.isArray(days) || days.length === 0) {
        return res.status(400).json({ error: "days array is required" });
    }

    try {
        const plan = await prisma.workoutPlan.create({
            data: {
                coachId,
                title,
                description,
                isTemplate: !!isTemplate,
                days: {
                    create: days.map((day: any) => ({
                        dayNumber: day.dayNumber,
                        title: day.title,
                        exercises: {
                            create: day.exercises.map((ex: any, idx: number) => ({
                                exerciseId: ex.exerciseId,
                                order: idx,
                                sets: Number(ex.sets) || 3,
                                reps: ex.reps || "10-12",
                                rest: ex.rest || "60s",
                                notes: ex.notes,
                            })),
                        },
                    })),
                },
            },
            include: { days: { include: { exercises: { include: { exercise: true } } } } },
        });
        res.status(201).json(plan);
    } catch (error) {
        console.error("[POST /plans]", error);
        res.status(500).json({ error: "Failed to create plan" });
    }
});

// POST /plans/:id/duplicate - Duplicate an existing workout plan
router.post("/:id/duplicate", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { id } = req.params;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const existingPlan = await prisma.workoutPlan.findFirst({
            where: { id: id as string, coachId },
            include: {
                days: {
                    include: {
                        exercises: true,
                    },
                    orderBy: { dayNumber: "asc" },
                },
            },
        });

        if (!existingPlan) return res.status(404).json({ error: "Plan not found" });

        const duplicatedPlan = await prisma.workoutPlan.create({
            data: {
                coachId,
                title: `${existingPlan.title} Copy`,
                description: existingPlan.description,
                isTemplate: existingPlan.isTemplate,
                days: {
                    create: existingPlan.days.map((day) => ({
                        dayNumber: day.dayNumber,
                        title: day.title,
                        exercises: {
                            create: day.exercises.map((exercise) => ({
                                exerciseId: exercise.exerciseId,
                                order: exercise.order,
                                sets: exercise.sets,
                                reps: exercise.reps,
                                rest: exercise.rest,
                                notes: exercise.notes,
                            })),
                        },
                    })),
                },
            },
            include: {
                days: { include: { exercises: { include: { exercise: true } } } },
                _count: { select: { assignments: true } },
            },
        });

        res.status(201).json({
            ...duplicatedPlan,
            daysPerWeek: duplicatedPlan.days.length,
        });
    } catch (error) {
        console.error(`[POST /plans/${id}/duplicate]`, error);
        res.status(500).json({ error: "Failed to duplicate plan" });
    }
});

// DELETE /plans/:id - Delete a workout plan
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { id } = req.params;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const result = await prisma.$transaction(async (tx) => {
            const plan = await tx.workoutPlan.findFirst({
                where: { id: id as string, coachId },
            });
            if (!plan) return null;

            const assignmentIds = (
                await tx.planAssignment.findMany({
                    where: { planId: id as string },
                    select: { id: true },
                })
            ).map((a) => a.id);

            if (assignmentIds.length > 0) {
                await tx.workoutLog.deleteMany({
                    where: { assignmentId: { in: assignmentIds } },
                });
                await tx.planAssignment.deleteMany({
                    where: { planId: id as string },
                });
            }

            await tx.workoutPlan.delete({ where: { id: plan.id } });
            return plan;
        });

        if (!result) return res.status(404).json({ error: "Plan not found" });

        res.json({ success: true });
    } catch (error) {
        console.error(`[DELETE /plans/${id}]`, error);
        res.status(500).json({ error: "Failed to delete plan" });
    }
});

export default router;
