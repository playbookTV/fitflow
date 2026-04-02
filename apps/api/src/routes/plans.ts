import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router: Router = Router();

// GET /plans - List plans for the coach
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
    const coachId = req.user?.id as string;
    if (!coachId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const plans = await prisma.workoutPlan.findMany({
            where: { coachId },
            include: { days: { include: { exercises: { include: { exercise: true } } } } },
            orderBy: { createdAt: "desc" },
        });
        res.json(plans);
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

export default router;
