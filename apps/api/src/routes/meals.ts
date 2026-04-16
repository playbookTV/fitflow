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

// PUT /meals/:id — update a meal
router.put("/:id", authenticate, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, category, protein, carbs, fat, calories, ingredients, prepTime, recipeUrl, imageUrl } = req.body;

    try {
        const meal = await prisma.meal.update({
            where: { id: id as string },
            data: {
                ...(name !== undefined && { name }),
                ...(category !== undefined && { category }),
                ...(protein !== undefined && { protein: protein != null ? Number(protein) : null }),
                ...(carbs !== undefined && { carbs: carbs != null ? Number(carbs) : null }),
                ...(fat !== undefined && { fat: fat != null ? Number(fat) : null }),
                ...(calories !== undefined && { calories: calories != null ? Number(calories) : null }),
                ...(ingredients !== undefined && { ingredients }),
                ...(prepTime !== undefined && { prepTime }),
                ...(recipeUrl !== undefined && { recipeUrl }),
                ...(imageUrl !== undefined && { imageUrl }),
            },
        });
        res.json(meal);
    } catch (error) {
        console.error(`[PUT /meals/${id}]`, error);
        res.status(500).json({ error: "Failed to update meal" });
    }
});

// DELETE /meals/:id — delete a meal
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
        await prisma.meal.delete({ where: { id: id as string } });
        res.json({ success: true });
    } catch (error) {
        console.error(`[DELETE /meals/${id}]`, error);
        res.status(500).json({ error: "Failed to delete meal" });
    }
});

export default router;
