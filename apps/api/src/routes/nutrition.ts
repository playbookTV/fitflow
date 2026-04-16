import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import {
    searchIngredients,
    getIngredientNutrition,
    searchRecipes,
    getRecipe,
    extractMacros,
} from "../lib/spoonacular";

const router: Router = Router();

// GET /nutrition/ingredients?q=chicken&limit=10
router.get("/ingredients", authenticate, async (req: AuthRequest, res: Response) => {
    const query = String(req.query.q || "");
    const limit = Math.min(Number(req.query.limit) || 10, 25);

    if (!query || query.length < 2) {
        return res.status(400).json({ error: "Query must be at least 2 characters" });
    }

    try {
        const results = await searchIngredients(query, limit);

        // Fetch nutrition for each result (cached individually)
        const withMacros = await Promise.all(
            results.map(async (ing) => {
                try {
                    const info = await getIngredientNutrition(ing.id);
                    const macros = extractMacros(info.nutrition.nutrients);
                    return {
                        id: ing.id,
                        name: ing.name,
                        image: `https://img.spoonacular.com/ingredients_100x100/${ing.image}`,
                        ...macros,
                    };
                } catch {
                    return {
                        id: ing.id,
                        name: ing.name,
                        image: `https://img.spoonacular.com/ingredients_100x100/${ing.image}`,
                        calories: null,
                        protein: null,
                        carbs: null,
                        fat: null,
                    };
                }
            })
        );

        res.json(withMacros);
    } catch (error) {
        console.error("[GET /nutrition/ingredients]", error);
        res.status(500).json({ error: "Failed to search ingredients" });
    }
});

// GET /nutrition/recipes?q=high+protein+breakfast&diet=high-protein&maxCalories=600&limit=10
router.get("/recipes", authenticate, async (req: AuthRequest, res: Response) => {
    const query = String(req.query.q || "");
    const diet = req.query.diet ? String(req.query.diet) : undefined;
    const maxCalories = req.query.maxCalories ? Number(req.query.maxCalories) : undefined;
    const limit = Math.min(Number(req.query.limit) || 10, 25);

    if (!query || query.length < 2) {
        return res.status(400).json({ error: "Query must be at least 2 characters" });
    }

    try {
        const results = await searchRecipes(query, { diet, maxCalories, limit });

        const formatted = results.map((recipe) => {
            const macros = recipe.nutrition
                ? extractMacros(recipe.nutrition.nutrients)
                : { calories: null, protein: null, carbs: null, fat: null };

            return {
                id: recipe.id,
                name: recipe.title,
                image: recipe.image,
                prepTime: `${recipe.readyInMinutes} min`,
                servings: recipe.servings,
                sourceUrl: recipe.sourceUrl,
                ...macros,
            };
        });

        res.json(formatted);
    } catch (error) {
        console.error("[GET /nutrition/recipes]", error);
        res.status(500).json({ error: "Failed to search recipes" });
    }
});

// GET /nutrition/recipes/:id — full recipe details
router.get("/recipes/:id", authenticate, async (req: AuthRequest, res: Response) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid recipe ID" });

    try {
        const recipe = await getRecipe(id);
        const macros = recipe.nutrition
            ? extractMacros(recipe.nutrition.nutrients)
            : { calories: null, protein: null, carbs: null, fat: null };

        res.json({
            id: recipe.id,
            name: recipe.title,
            image: recipe.image,
            prepTime: `${recipe.readyInMinutes} min`,
            servings: recipe.servings,
            sourceUrl: recipe.sourceUrl,
            ...macros,
        });
    } catch (error) {
        console.error(`[GET /nutrition/recipes/${id}]`, error);
        res.status(500).json({ error: "Failed to fetch recipe" });
    }
});

export default router;
