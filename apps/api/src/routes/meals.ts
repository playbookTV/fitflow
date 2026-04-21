import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router: Router = Router();

// GET /meals — list/search local meals
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
    const { search, category } = req.query;

    try {
        const meals = await prisma.meal.findMany({
            where: {
                AND: [
                    search ? { name: { contains: String(search), mode: "insensitive" } } : {},
                    category ? { category: String(category) } : {},
                ],
            },
            take: 50,
            orderBy: { name: "asc" },
        });
        res.json(meals);
    } catch (error) {
        console.error("[GET /meals]", error);
        res.status(500).json({ error: "Failed to fetch meals" });
    }
});

// POST /meals — create a meal
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
    const { name, category, protein, carbs, fat, calories, ingredients, prepTime, recipeUrl, spoonacularId, imageUrl } = req.body;

    if (!name || !category) {
        return res.status(400).json({ error: "name and category are required" });
    }

    try {
        // If spoonacularId provided, check if already imported
        if (spoonacularId) {
            const existing = await prisma.meal.findUnique({ where: { spoonacularId } });
            if (existing) return res.json(existing);
        }

        const meal = await prisma.meal.create({
            data: {
                name,
                category,
                protein: protein != null ? Number(protein) : null,
                carbs: carbs != null ? Number(carbs) : null,
                fat: fat != null ? Number(fat) : null,
                calories: calories != null ? Number(calories) : null,
                ingredients: ingredients || [],
                prepTime: prepTime || null,
                recipeUrl: recipeUrl || null,
                spoonacularId: spoonacularId ? Number(spoonacularId) : null,
                imageUrl: imageUrl || null,
            },
        });
        res.status(201).json(meal);
    } catch (error: any) {
        if (error?.code === "P2002") {
            return res.status(409).json({ error: "A meal with this name already exists" });
        }
        console.error("[POST /meals]", error);
        res.status(500).json({ error: "Failed to create meal" });
    }
});

// PUT and DELETE removed — the Meal table is a shared global catalog with no
// ownership model. Without a coachId column, any authenticated coach could
// mutate or delete meals used by every other coach on the platform.
// If per-coach meal editing is needed, add a coachId column + migration first.

export default router;
