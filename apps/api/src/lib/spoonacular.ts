import axios from "axios";
import { redis } from "./redis";

const API_KEY = process.env.SPOONACULAR_API_KEY;
const BASE_URL = "https://api.spoonacular.com";
const CACHE_TTL = 86400; // 24 hours

async function cachedGet<T>(cacheKey: string, url: string, params: Record<string, any>): Promise<T> {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const response = await axios.get(url, {
        params: { ...params, apiKey: API_KEY },
    });

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(response.data));
    return response.data;
}

export interface SpoonacularIngredient {
    id: number;
    name: string;
    image: string;
}

export interface SpoonacularNutrient {
    name: string;
    amount: number;
    unit: string;
}

export interface SpoonacularIngredientInfo {
    id: number;
    name: string;
    image: string;
    nutrition: {
        nutrients: SpoonacularNutrient[];
    };
}

export interface SpoonacularRecipe {
    id: number;
    title: string;
    image: string;
    readyInMinutes: number;
    servings: number;
    sourceUrl: string;
    nutrition?: {
        nutrients: SpoonacularNutrient[];
    };
}

export async function searchIngredients(query: string, limit = 10): Promise<SpoonacularIngredient[]> {
    const cacheKey = `spoon:ing:${query}:${limit}`;
    const data = await cachedGet<{ results: SpoonacularIngredient[] }>(
        cacheKey,
        `${BASE_URL}/food/ingredients/search`,
        { query, number: limit }
    );
    return data.results;
}

export async function getIngredientNutrition(id: number, amount = 100, unit = "g"): Promise<SpoonacularIngredientInfo> {
    const cacheKey = `spoon:ing-info:${id}:${amount}:${unit}`;
    return cachedGet<SpoonacularIngredientInfo>(
        cacheKey,
        `${BASE_URL}/food/ingredients/${id}/information`,
        { amount, unit }
    );
}

export async function searchRecipes(
    query: string,
    options: { diet?: string; maxCalories?: number; limit?: number } = {}
): Promise<SpoonacularRecipe[]> {
    const limit = options.limit || 10;
    const cacheKey = `spoon:recipe:${query}:${options.diet || ""}:${options.maxCalories || ""}:${limit}`;
    const data = await cachedGet<{ results: SpoonacularRecipe[] }>(
        cacheKey,
        `${BASE_URL}/recipes/complexSearch`,
        {
            query,
            diet: options.diet,
            maxCalories: options.maxCalories,
            addRecipeNutrition: true,
            number: limit,
        }
    );
    return data.results;
}

export async function getRecipe(id: number): Promise<SpoonacularRecipe> {
    const cacheKey = `spoon:recipe-info:${id}`;
    return cachedGet<SpoonacularRecipe>(
        cacheKey,
        `${BASE_URL}/recipes/${id}/information`,
        { includeNutrition: true }
    );
}

/** Extract macro values from a Spoonacular nutrients array */
export function extractMacros(nutrients: SpoonacularNutrient[]) {
    const get = (name: string) => nutrients.find((n) => n.name === name)?.amount ?? null;
    return {
        calories: get("Calories") ? Math.round(get("Calories")!) : null,
        protein: get("Protein"),
        carbs: get("Carbohydrates"),
        fat: get("Fat"),
    };
}
