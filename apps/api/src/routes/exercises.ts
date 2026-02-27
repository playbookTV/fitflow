import { Router, Request, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router: Router = Router();

// GET /exercises - List all exercises (paginated with search)
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
    const { search, category } = req.query;

    try {
        const exercises = await prisma.exercise.findMany({
            where: {
                AND: [
                    search ? { name: { contains: String(search), mode: "insensitive" } } : {},
                    category ? { category: String(category) } : {},
                ],
            },
            take: 50,
            orderBy: { name: "asc" },
        });
        res.json(exercises);
    } catch (error) {
        console.error("[GET /exercises]", error);
        res.status(500).json({ error: "Failed to fetch exercises" });
    }
});

export default router;
