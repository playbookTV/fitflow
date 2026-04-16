import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router: Router = Router();

// GET /meal-plans — list meal plans for the coach
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const plans = await prisma.mealPlan.findMany({
            where: { coachId },
            include: {
                days: { include: { entries: { include: { meal: true } } } },
                _count: { select: { assignments: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(plans.map((plan) => ({
            ...plan,
            daysPerWeek: plan.days.length,
        })));
    } catch (error) {
        console.error("[GET /meal-plans]", error);
        res.status(500).json({ error: "Failed to fetch meal plans" });
    }
});

// POST /meal-plans — create a new meal plan
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { title, description, isTemplate, days } = req.body;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });
    if (!Array.isArray(days) || days.length === 0) {
        return res.status(400).json({ error: "days array is required" });
    }

    try {
        const plan = await prisma.mealPlan.create({
            data: {
                coachId,
                title,
                description,
                isTemplate: !!isTemplate,
                days: {
                    create: days.map((day: any) => ({
                        dayNumber: day.dayNumber,
                        title: day.title,
                        entries: {
                            create: (day.entries || []).map((entry: any, idx: number) => ({
                                mealId: entry.mealId,
                                order: idx,
                                servingSize: entry.servingSize || null,
                                notes: entry.notes || null,
                            })),
                        },
                    })),
                },
            },
            include: { days: { include: { entries: { include: { meal: true } } } } },
        });
        res.status(201).json(plan);
    } catch (error) {
        console.error("[POST /meal-plans]", error);
        res.status(500).json({ error: "Failed to create meal plan" });
    }
});

// GET /meal-plans/:id — get a single meal plan with full details
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { id } = req.params;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const plan = await prisma.mealPlan.findFirst({
            where: { id: id as string, coachId },
            include: {
                days: {
                    include: { entries: { include: { meal: true }, orderBy: { order: "asc" } } },
                    orderBy: { dayNumber: "asc" },
                },
                _count: { select: { assignments: true } },
            },
        });

        if (!plan) return res.status(404).json({ error: "Meal plan not found" });

        res.json({ ...plan, daysPerWeek: plan.days.length });
    } catch (error) {
        console.error(`[GET /meal-plans/${id}]`, error);
        res.status(500).json({ error: "Failed to fetch meal plan" });
    }
});

// PUT /meal-plans/:id — update an existing meal plan
router.put("/:id", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { id } = req.params;
    const { title, description, days } = req.body;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const existing = await prisma.mealPlan.findFirst({
            where: { id: id as string, coachId },
        });
        if (!existing) return res.status(404).json({ error: "Meal plan not found" });

        const plan = await prisma.$transaction(async (tx) => {
            await tx.mealDay.deleteMany({ where: { planId: id as string } });

            return tx.mealPlan.update({
                where: { id: id as string },
                data: {
                    title,
                    description,
                    days: {
                        create: days.map((day: any) => ({
                            dayNumber: day.dayNumber,
                            title: day.title,
                            entries: {
                                create: (day.entries || []).map((entry: any, idx: number) => ({
                                    mealId: entry.mealId,
                                    order: idx,
                                    servingSize: entry.servingSize || null,
                                    notes: entry.notes || null,
                                })),
                            },
                        })),
                    },
                },
                include: {
                    days: { include: { entries: { include: { meal: true } } } },
                    _count: { select: { assignments: true } },
                },
            });
        });

        res.json({ ...plan, daysPerWeek: plan.days.length });
    } catch (error) {
        console.error(`[PUT /meal-plans/${id}]`, error);
        res.status(500).json({ error: "Failed to update meal plan" });
    }
});

// POST /meal-plans/:id/duplicate — clone a meal plan
router.post("/:id/duplicate", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { id } = req.params;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const existing = await prisma.mealPlan.findFirst({
            where: { id: id as string, coachId },
            include: {
                days: { include: { entries: true }, orderBy: { dayNumber: "asc" } },
            },
        });

        if (!existing) return res.status(404).json({ error: "Meal plan not found" });

        const duplicated = await prisma.mealPlan.create({
            data: {
                coachId,
                title: `${existing.title} Copy`,
                description: existing.description,
                isTemplate: existing.isTemplate,
                days: {
                    create: existing.days.map((day) => ({
                        dayNumber: day.dayNumber,
                        title: day.title,
                        entries: {
                            create: day.entries.map((entry) => ({
                                mealId: entry.mealId,
                                order: entry.order,
                                servingSize: entry.servingSize,
                                notes: entry.notes,
                            })),
                        },
                    })),
                },
            },
            include: {
                days: { include: { entries: { include: { meal: true } } } },
                _count: { select: { assignments: true } },
            },
        });

        res.status(201).json({ ...duplicated, daysPerWeek: duplicated.days.length });
    } catch (error) {
        console.error(`[POST /meal-plans/${id}/duplicate]`, error);
        res.status(500).json({ error: "Failed to duplicate meal plan" });
    }
});

// DELETE /meal-plans/:id — delete a meal plan
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    const { id } = req.params;

    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const result = await prisma.$transaction(async (tx) => {
            const plan = await tx.mealPlan.findFirst({
                where: { id: id as string, coachId },
            });
            if (!plan) return null;

            const assignmentIds = (
                await tx.mealAssignment.findMany({
                    where: { planId: id as string },
                    select: { id: true },
                })
            ).map((a) => a.id);

            if (assignmentIds.length > 0) {
                await tx.mealLog.deleteMany({
                    where: { assignmentId: { in: assignmentIds } },
                });
                await tx.mealAssignment.deleteMany({
                    where: { planId: id as string },
                });
            }

            await tx.mealPlan.delete({ where: { id: plan.id } });
            return plan;
        });

        if (!result) return res.status(404).json({ error: "Meal plan not found" });

        res.json({ success: true });
    } catch (error) {
        console.error(`[DELETE /meal-plans/${id}]`, error);
        res.status(500).json({ error: "Failed to delete meal plan" });
    }
});

export default router;
