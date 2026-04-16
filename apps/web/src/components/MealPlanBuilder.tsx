"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Save, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { getAuthHeaders } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface NutritionResult {
    id: number;
    name: string;
    image?: string;
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    prepTime?: string;
    sourceUrl?: string;
}

interface MealEntry {
    id: string;
    mealId: string;
    name: string;
    category: string;
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    servingSize: string;
    notes: string;
}

interface MealDay {
    id: string;
    dayNumber: number;
    title: string;
    entries: MealEntry[];
    isOpen: boolean;
}

interface MealPlanBuilderProps {
    planId?: string;
}

const CATEGORIES = ["breakfast", "lunch", "dinner", "snack"];

export default function MealPlanBuilder({ planId }: MealPlanBuilderProps) {
    const router = useRouter();
    const [title, setTitle] = useState("New Meal Plan");
    const [description, setDescription] = useState("");
    const [days, setDays] = useState<MealDay[]>([
        { id: crypto.randomUUID(), dayNumber: 1, title: "Day 1", entries: [], isOpen: true },
    ]);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchType, setSearchType] = useState<"ingredients" | "recipes">("recipes");
    const [searchResults, setSearchResults] = useState<NutritionResult[]>([]);
    const [activeDayIdx, setActiveDayIdx] = useState<number | null>(0);
    const [activeCategory, setActiveCategory] = useState("breakfast");
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(!!planId);

    // Load existing plan when editing
    useEffect(() => {
        if (!planId) return;
        getAuthHeaders()
            .then((headers) =>
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/meal-plans/${planId}`, { headers })
            )
            .then((res) => {
                if (!res.ok) throw new Error("Plan not found");
                return res.json();
            })
            .then((plan) => {
                setTitle(plan.title);
                setDescription(plan.description || "");
                setDays(
                    plan.days.map((day: { id: string; dayNumber: number; title: string; entries: { id: string; mealId: string; servingSize?: string; notes?: string; meal?: { name?: string; category?: string; calories?: number; protein?: number; carbs?: number; fat?: number } }[] }) => ({
                        id: day.id,
                        dayNumber: day.dayNumber,
                        title: day.title || `Day ${day.dayNumber}`,
                        isOpen: true,
                        entries: day.entries.map((e: { id: string; mealId: string; servingSize?: string; notes?: string; meal?: { name?: string; category?: string; calories?: number; protein?: number; carbs?: number; fat?: number } }) => ({
                            id: e.id,
                            mealId: e.mealId,
                            name: e.meal?.name || "Unknown",
                            category: e.meal?.category || "snack",
                            calories: e.meal?.calories,
                            protein: e.meal?.protein,
                            carbs: e.meal?.carbs,
                            fat: e.meal?.fat,
                            servingSize: e.servingSize || "",
                            notes: e.notes || "",
                        })),
                    }))
                );
            })
            .catch((err) => console.error("Failed to load meal plan:", err))
            .finally(() => setLoading(false));
    }, [planId]);

    // Search Spoonacular
    useEffect(() => {
        if (searchTerm.length < 3) {
            setSearchResults([]);
            return;
        }
        const controller = new AbortController();
        const doSearch = async () => {
            try {
                const headers = await getAuthHeaders();
                const endpoint = searchType === "recipes" ? "recipes" : "ingredients";
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/nutrition/${endpoint}?q=${encodeURIComponent(searchTerm)}&limit=10`,
                    { headers, signal: controller.signal }
                );
                if (res.ok) setSearchResults(await res.json());
            } catch {
                /* abort or error */
            }
        };
        const timer = setTimeout(doSearch, 300);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [searchTerm, searchType]);

    const addDay = () => {
        setDays((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                dayNumber: prev.length + 1,
                title: `Day ${prev.length + 1}`,
                entries: [],
                isOpen: true,
            },
        ]);
    };

    const removeDay = (idx: number) => {
        setDays((prev) => prev.filter((_, i) => i !== idx).map((d, i) => ({ ...d, dayNumber: i + 1 })));
    };

    const addMealToDay = async (result: NutritionResult) => {
        if (activeDayIdx === null) return;

        // Create or find the meal in the local library
        const headers = await getAuthHeaders();
        let mealId: string;

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/meals`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify({
                    name: result.name,
                    category: activeCategory,
                    protein: result.protein,
                    carbs: result.carbs,
                    fat: result.fat,
                    calories: result.calories,
                    spoonacularId: result.id,
                    imageUrl: result.image,
                    prepTime: result.prepTime,
                    recipeUrl: result.sourceUrl,
                    ingredients: [],
                }),
            });
            const meal = await res.json();
            mealId = meal.id;
        } catch {
            return;
        }

        const entry: MealEntry = {
            id: crypto.randomUUID(),
            mealId,
            name: result.name,
            category: activeCategory,
            calories: result.calories,
            protein: result.protein,
            carbs: result.carbs,
            fat: result.fat,
            servingSize: "",
            notes: "",
        };

        setDays((prev) =>
            prev.map((day, i) =>
                i === activeDayIdx ? { ...day, entries: [...day.entries, entry] } : day
            )
        );
        setSearchTerm("");
        setSearchResults([]);
    };

    const removeEntry = (dayIdx: number, entryIdx: number) => {
        setDays((prev) =>
            prev.map((day, i) =>
                i === dayIdx
                    ? { ...day, entries: day.entries.filter((_, j) => j !== entryIdx) }
                    : day
            )
        );
    };

    const getDayMacros = (day: MealDay) => {
        const totals = day.entries.reduce(
            (acc, e) => ({
                calories: acc.calories + (e.calories || 0),
                protein: acc.protein + (e.protein || 0),
                carbs: acc.carbs + (e.carbs || 0),
                fat: acc.fat + (e.fat || 0),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
        return totals;
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const headers = await getAuthHeaders();
            const payload = {
                title,
                description,
                days: days.map((day) => ({
                    dayNumber: day.dayNumber,
                    title: day.title,
                    entries: day.entries.map((entry, idx) => ({
                        mealId: entry.mealId,
                        order: idx,
                        servingSize: entry.servingSize || null,
                        notes: entry.notes || null,
                    })),
                })),
            };

            const url = planId
                ? `${process.env.NEXT_PUBLIC_API_URL}/meal-plans/${planId}`
                : `${process.env.NEXT_PUBLIC_API_URL}/meal-plans`;

            const res = await fetch(url, {
                method: planId ? "PUT" : "POST",
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                router.push("/dashboard/meal-plans");
            }
        } catch (error) {
            console.error("Failed to save meal plan:", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <div className="skeleton h-96 w-full max-w-4xl rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-primary">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="text-2xl font-bold bg-transparent text-white border-none outline-none w-full"
                            placeholder="Meal Plan Title"
                        />
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="text-sm text-text-faint bg-transparent border-none outline-none w-full mt-1"
                            placeholder="Add a description..."
                        />
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? "Saving..." : "Save Plan"}
                    </button>
                </div>

                {/* Days */}
                <div className="space-y-4">
                    {days.map((day, dayIdx) => {
                        const macros = getDayMacros(day);
                        return (
                            <div key={day.id} className="card overflow-hidden">
                                {/* Day header */}
                                <button
                                    onClick={() =>
                                        setDays((prev) =>
                                            prev.map((d, i) =>
                                                i === dayIdx ? { ...d, isOpen: !d.isOpen } : d
                                            )
                                        )
                                    }
                                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-bg-hover transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        {day.isOpen ? (
                                            <ChevronDown className="w-4 h-4 text-text-faint" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-text-faint" />
                                        )}
                                        <span className="font-semibold text-white">{day.title}</span>
                                        <span className="text-xs text-text-faint">
                                            {day.entries.length} meals
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs text-brand-green font-mono">
                                            {macros.calories} cal | P:{Math.round(macros.protein)}g C:{Math.round(macros.carbs)}g F:{Math.round(macros.fat)}g
                                        </span>
                                        {days.length > 1 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeDay(dayIdx);
                                                }}
                                                className="text-text-faint hover:text-brand-red transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </button>

                                {/* Day content */}
                                {day.isOpen && (
                                    <div className="px-5 pb-5 border-t border-border">
                                        {/* Entries list */}
                                        {day.entries.length > 0 && (
                                            <div className="mt-4 space-y-2">
                                                {day.entries.map((entry, entryIdx) => (
                                                    <div
                                                        key={entry.id}
                                                        className="flex items-center justify-between p-3 rounded-xl bg-bg-hover group"
                                                    >
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold uppercase text-brand-orange bg-brand-orange/10 px-1.5 py-0.5 rounded">
                                                                    {entry.category}
                                                                </span>
                                                                <span className="text-sm font-medium text-white">
                                                                    {entry.name}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-text-faint mt-1 font-mono">
                                                                {entry.calories || 0} cal | P:{Math.round(entry.protein || 0)}g C:{Math.round(entry.carbs || 0)}g F:{Math.round(entry.fat || 0)}g
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => removeEntry(dayIdx, entryIdx)}
                                                            className="text-text-faint hover:text-brand-red opacity-0 group-hover:opacity-100 transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Add meal section */}
                                        <div className="mt-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <select
                                                    value={activeCategory}
                                                    onChange={(e) => setActiveCategory(e.target.value)}
                                                    className="input text-xs !py-1.5 !px-2 w-auto"
                                                >
                                                    {CATEGORIES.map((cat) => (
                                                        <option key={cat} value={cat}>
                                                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                                        </option>
                                                    ))}
                                                </select>
                                                <select
                                                    value={searchType}
                                                    onChange={(e) => setSearchType(e.target.value as "ingredients" | "recipes")}
                                                    className="input text-xs !py-1.5 !px-2 w-auto"
                                                >
                                                    <option value="recipes">Recipes</option>
                                                    <option value="ingredients">Ingredients</option>
                                                </select>
                                                <div className="relative flex-1">
                                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                                                    <input
                                                        type="text"
                                                        placeholder={`Search ${searchType}...`}
                                                        value={searchTerm}
                                                        onFocus={() => setActiveDayIdx(dayIdx)}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="input-with-icon w-full text-sm"
                                                    />
                                                </div>
                                            </div>

                                            {/* Search results */}
                                            {activeDayIdx === dayIdx && searchResults.length > 0 && (
                                                <div className="space-y-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-bg-secondary p-2">
                                                    {searchResults.map((result) => (
                                                        <button
                                                            key={result.id}
                                                            onClick={() => addMealToDay(result)}
                                                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-bg-hover transition-colors flex items-center justify-between"
                                                        >
                                                            <span className="text-sm text-white truncate">
                                                                {result.name}
                                                            </span>
                                                            <span className="text-xs text-text-faint font-mono shrink-0 ml-2">
                                                                {result.calories || "?"} cal
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Add day button */}
                <button
                    onClick={addDay}
                    className="w-full mt-4 py-4 rounded-2xl border border-dashed border-border-hover hover:border-brand-green/30 hover:bg-bg-hover transition-all flex items-center justify-center gap-2 text-text-faint hover:text-brand-green"
                >
                    <Plus className="w-4 h-4" />
                    Add Day
                </button>
            </div>
        </div>
    );
}
