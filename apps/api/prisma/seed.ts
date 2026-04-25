import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SYSTEM_COACH_ID = "00000000-0000-0000-0000-000000000000";

const exercises = [
    { name: "Barbell Squat", category: "Legs", muscles: ["Quads", "Glutes", "Hamstrings"] },
    { name: "Deadlift", category: "Back", muscles: ["Lower Back", "Hamstrings", "Glutes"] },
    { name: "Bench Press", category: "Chest", muscles: ["Chest", "Triceps", "Shoulders"] },
    { name: "Overhead Press", category: "Shoulders", muscles: ["Shoulders", "Triceps"] },
    { name: "Pull Ups", category: "Back", muscles: ["Lats", "Biceps"] },
    { name: "Barbell Row", category: "Back", muscles: ["Lats", "Rhomboids", "Biceps"] },
    { name: "Incline Dumbbell Press", category: "Chest", muscles: ["Upper Chest", "Front Delts"] },
    { name: "Romanian Deadlift", category: "Legs", muscles: ["Hamstrings", "Glutes"] },
    { name: "Bulgarian Split Squat", category: "Legs", muscles: ["Quads", "Glutes"] },
    { name: "Lateral Raises", category: "Shoulders", muscles: ["Side Delts"] },
    { name: "Tricep Pushdowns", category: "Arms", muscles: ["Triceps"] },
    { name: "Bicep Curls", category: "Arms", muscles: ["Biceps"] },
    { name: "Face Pulls", category: "Shoulders", muscles: ["Rear Delts", "Traps"] },
    { name: "Calf Raises", category: "Legs", muscles: ["Calves"] },
    { name: "Plank", category: "Core", muscles: ["Abs", "Obliques"] },
];

interface TemplateDay {
    dayNumber: number;
    title: string;
    exercises: { name: string; sets: number; reps: string; rest: string; notes?: string }[];
}

interface Template {
    title: string;
    description: string;
    tags: string[];
    days: TemplateDay[];
}

const templates: Template[] = [
    {
        title: "3-Day Full Body",
        description: "A balanced full-body program hitting all major muscle groups three times per week. Great for beginners or those short on time.",
        tags: ["full-body", "beginner", "general-fitness"],
        days: [
            {
                dayNumber: 1, title: "Full Body A",
                exercises: [
                    { name: "Barbell Squat", sets: 3, reps: "8-10", rest: "90s" },
                    { name: "Bench Press", sets: 3, reps: "8-10", rest: "90s" },
                    { name: "Barbell Row", sets: 3, reps: "8-10", rest: "90s" },
                    { name: "Overhead Press", sets: 3, reps: "10-12", rest: "60s" },
                    { name: "Plank", sets: 3, reps: "30-45s", rest: "45s" },
                ],
            },
            {
                dayNumber: 2, title: "Full Body B",
                exercises: [
                    { name: "Deadlift", sets: 3, reps: "6-8", rest: "120s" },
                    { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", rest: "60s" },
                    { name: "Pull Ups", sets: 3, reps: "6-10", rest: "90s" },
                    { name: "Bulgarian Split Squat", sets: 3, reps: "10-12", rest: "60s", notes: "Each leg" },
                    { name: "Face Pulls", sets: 3, reps: "12-15", rest: "45s" },
                ],
            },
            {
                dayNumber: 3, title: "Full Body C",
                exercises: [
                    { name: "Barbell Squat", sets: 3, reps: "10-12", rest: "90s" },
                    { name: "Bench Press", sets: 3, reps: "10-12", rest: "60s" },
                    { name: "Barbell Row", sets: 3, reps: "10-12", rest: "60s" },
                    { name: "Romanian Deadlift", sets: 3, reps: "10-12", rest: "60s" },
                    { name: "Lateral Raises", sets: 3, reps: "12-15", rest: "45s" },
                ],
            },
        ],
    },
    {
        title: "Push Pull Legs",
        description: "Classic 3-day split targeting push muscles, pull muscles, and legs separately. Ideal for intermediate lifters focused on hypertrophy.",
        tags: ["ppl", "hypertrophy", "intermediate"],
        days: [
            {
                dayNumber: 1, title: "Push",
                exercises: [
                    { name: "Bench Press", sets: 4, reps: "6-8", rest: "120s" },
                    { name: "Overhead Press", sets: 3, reps: "8-10", rest: "90s" },
                    { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", rest: "60s" },
                    { name: "Lateral Raises", sets: 3, reps: "12-15", rest: "45s" },
                    { name: "Tricep Pushdowns", sets: 3, reps: "10-12", rest: "45s" },
                ],
            },
            {
                dayNumber: 2, title: "Pull",
                exercises: [
                    { name: "Deadlift", sets: 4, reps: "5-6", rest: "180s" },
                    { name: "Pull Ups", sets: 3, reps: "6-10", rest: "90s" },
                    { name: "Barbell Row", sets: 3, reps: "8-10", rest: "90s" },
                    { name: "Face Pulls", sets: 3, reps: "12-15", rest: "45s" },
                    { name: "Bicep Curls", sets: 3, reps: "10-12", rest: "45s" },
                ],
            },
            {
                dayNumber: 3, title: "Legs",
                exercises: [
                    { name: "Barbell Squat", sets: 4, reps: "6-8", rest: "120s" },
                    { name: "Romanian Deadlift", sets: 3, reps: "8-10", rest: "90s" },
                    { name: "Bulgarian Split Squat", sets: 3, reps: "10-12", rest: "60s", notes: "Each leg" },
                    { name: "Calf Raises", sets: 4, reps: "12-15", rest: "45s" },
                    { name: "Plank", sets: 3, reps: "45-60s", rest: "45s" },
                ],
            },
        ],
    },
    {
        title: "Upper Lower Split",
        description: "4-day program alternating upper and lower body sessions. Balanced volume with good recovery between sessions.",
        tags: ["upper-lower", "strength", "hypertrophy"],
        days: [
            {
                dayNumber: 1, title: "Upper A",
                exercises: [
                    { name: "Bench Press", sets: 4, reps: "6-8", rest: "120s" },
                    { name: "Barbell Row", sets: 4, reps: "6-8", rest: "90s" },
                    { name: "Overhead Press", sets: 3, reps: "8-10", rest: "90s" },
                    { name: "Bicep Curls", sets: 3, reps: "10-12", rest: "45s" },
                    { name: "Tricep Pushdowns", sets: 3, reps: "10-12", rest: "45s" },
                ],
            },
            {
                dayNumber: 2, title: "Lower A",
                exercises: [
                    { name: "Barbell Squat", sets: 4, reps: "6-8", rest: "120s" },
                    { name: "Romanian Deadlift", sets: 3, reps: "8-10", rest: "90s" },
                    { name: "Bulgarian Split Squat", sets: 3, reps: "10-12", rest: "60s", notes: "Each leg" },
                    { name: "Calf Raises", sets: 4, reps: "12-15", rest: "45s" },
                    { name: "Plank", sets: 3, reps: "30-45s", rest: "45s" },
                ],
            },
            {
                dayNumber: 3, title: "Upper B",
                exercises: [
                    { name: "Incline Dumbbell Press", sets: 4, reps: "8-10", rest: "90s" },
                    { name: "Pull Ups", sets: 4, reps: "6-10", rest: "90s" },
                    { name: "Lateral Raises", sets: 3, reps: "12-15", rest: "45s" },
                    { name: "Face Pulls", sets: 3, reps: "12-15", rest: "45s" },
                    { name: "Bicep Curls", sets: 3, reps: "10-12", rest: "45s" },
                ],
            },
            {
                dayNumber: 4, title: "Lower B",
                exercises: [
                    { name: "Deadlift", sets: 4, reps: "5-6", rest: "180s" },
                    { name: "Barbell Squat", sets: 3, reps: "10-12", rest: "90s" },
                    { name: "Bulgarian Split Squat", sets: 3, reps: "10-12", rest: "60s", notes: "Each leg" },
                    { name: "Calf Raises", sets: 4, reps: "12-15", rest: "45s" },
                ],
            },
        ],
    },
    {
        title: "5x5 Strength Program",
        description: "Simple, proven strength-building program using 5 sets of 5 reps on compound movements. Best for beginners wanting to build a strength foundation.",
        tags: ["strength", "beginner", "compound"],
        days: [
            {
                dayNumber: 1, title: "Workout A",
                exercises: [
                    { name: "Barbell Squat", sets: 5, reps: "5", rest: "180s", notes: "Add 2.5kg each session" },
                    { name: "Bench Press", sets: 5, reps: "5", rest: "180s", notes: "Add 2.5kg each session" },
                    { name: "Barbell Row", sets: 5, reps: "5", rest: "180s", notes: "Add 2.5kg each session" },
                ],
            },
            {
                dayNumber: 2, title: "Workout B",
                exercises: [
                    { name: "Barbell Squat", sets: 5, reps: "5", rest: "180s", notes: "Add 2.5kg each session" },
                    { name: "Overhead Press", sets: 5, reps: "5", rest: "180s", notes: "Add 2.5kg each session" },
                    { name: "Deadlift", sets: 1, reps: "5", rest: "180s", notes: "Add 5kg each session" },
                ],
            },
        ],
    },
    {
        title: "Fat Loss Circuit",
        description: "High-intensity circuit training with short rest periods to maximize calorie burn. Combines compound lifts with bodyweight movements.",
        tags: ["fat-loss", "weight-loss", "circuit"],
        days: [
            {
                dayNumber: 1, title: "Circuit A",
                exercises: [
                    { name: "Barbell Squat", sets: 4, reps: "12", rest: "30s", notes: "Use moderate weight" },
                    { name: "Bench Press", sets: 4, reps: "12", rest: "30s" },
                    { name: "Pull Ups", sets: 4, reps: "8-10", rest: "30s", notes: "Use band for assistance if needed" },
                    { name: "Plank", sets: 3, reps: "45s", rest: "30s" },
                    { name: "Calf Raises", sets: 3, reps: "15-20", rest: "30s" },
                ],
            },
            {
                dayNumber: 2, title: "Circuit B",
                exercises: [
                    { name: "Romanian Deadlift", sets: 4, reps: "12", rest: "30s" },
                    { name: "Overhead Press", sets: 4, reps: "12", rest: "30s" },
                    { name: "Barbell Row", sets: 4, reps: "12", rest: "30s" },
                    { name: "Bulgarian Split Squat", sets: 3, reps: "12", rest: "30s", notes: "Each leg, bodyweight or light dumbbells" },
                    { name: "Face Pulls", sets: 3, reps: "15", rest: "30s" },
                ],
            },
            {
                dayNumber: 3, title: "Circuit C",
                exercises: [
                    { name: "Deadlift", sets: 4, reps: "10", rest: "30s", notes: "Use moderate weight" },
                    { name: "Incline Dumbbell Press", sets: 4, reps: "12", rest: "30s" },
                    { name: "Barbell Row", sets: 4, reps: "12", rest: "30s" },
                    { name: "Lateral Raises", sets: 3, reps: "15", rest: "30s" },
                    { name: "Plank", sets: 3, reps: "60s", rest: "30s" },
                ],
            },
        ],
    },
    {
        title: "Bodyweight Only",
        description: "No equipment needed. Uses bodyweight exercises and variations for a full workout. Perfect for training at home or while travelling.",
        tags: ["bodyweight", "beginner", "home"],
        days: [
            {
                dayNumber: 1, title: "Upper Body",
                exercises: [
                    { name: "Pull Ups", sets: 4, reps: "5-10", rest: "90s", notes: "Use doorframe pull-up bar or sturdy overhead bar" },
                    { name: "Plank", sets: 3, reps: "45-60s", rest: "45s" },
                    { name: "Face Pulls", sets: 3, reps: "15-20", rest: "45s", notes: "Use resistance band if available" },
                ],
            },
            {
                dayNumber: 2, title: "Lower Body",
                exercises: [
                    { name: "Bulgarian Split Squat", sets: 4, reps: "12-15", rest: "60s", notes: "Each leg, bodyweight" },
                    { name: "Romanian Deadlift", sets: 3, reps: "15", rest: "60s", notes: "Single-leg, bodyweight" },
                    { name: "Calf Raises", sets: 4, reps: "20-25", rest: "30s", notes: "Single-leg on a step" },
                    { name: "Plank", sets: 3, reps: "45-60s", rest: "45s" },
                ],
            },
            {
                dayNumber: 3, title: "Full Body",
                exercises: [
                    { name: "Pull Ups", sets: 3, reps: "5-8", rest: "90s" },
                    { name: "Bulgarian Split Squat", sets: 3, reps: "10-12", rest: "60s", notes: "Each leg" },
                    { name: "Plank", sets: 3, reps: "60s", rest: "45s" },
                    { name: "Calf Raises", sets: 3, reps: "20", rest: "30s" },
                ],
            },
        ],
    },
];

// ─── Meal catalog ───────────────────────────────────────────────────────────

const meals = [
    // Breakfast
    { name: "Scrambled Eggs (3 large)", category: "breakfast", calories: 300, protein: 21, carbs: 3, fat: 22, ingredients: ["eggs", "butter", "salt", "pepper"] },
    { name: "Greek Yoghurt with Berries", category: "breakfast", calories: 200, protein: 18, carbs: 22, fat: 4, ingredients: ["greek yoghurt", "mixed berries", "honey"] },
    { name: "Overnight Oats", category: "breakfast", calories: 380, protein: 14, carbs: 55, fat: 10, ingredients: ["oats", "milk", "chia seeds", "banana", "honey"] },
    { name: "Protein Pancakes", category: "breakfast", calories: 420, protein: 32, carbs: 48, fat: 10, ingredients: ["oats", "egg whites", "protein powder", "banana"] },
    { name: "Avocado Toast with Eggs", category: "breakfast", calories: 450, protein: 20, carbs: 35, fat: 26, ingredients: ["sourdough bread", "avocado", "eggs", "chilli flakes"] },
    { name: "Smoothie Bowl", category: "breakfast", calories: 350, protein: 22, carbs: 50, fat: 8, ingredients: ["frozen berries", "banana", "protein powder", "granola", "almond milk"] },
    { name: "Egg White Omelette", category: "breakfast", calories: 220, protein: 28, carbs: 6, fat: 8, ingredients: ["egg whites", "spinach", "mushrooms", "feta cheese"] },

    // Lunch
    { name: "Grilled Chicken Salad", category: "lunch", calories: 450, protein: 42, carbs: 18, fat: 24, ingredients: ["chicken breast", "mixed greens", "cherry tomatoes", "cucumber", "olive oil", "feta"] },
    { name: "Turkey Wrap", category: "lunch", calories: 420, protein: 35, carbs: 38, fat: 14, ingredients: ["wholemeal wrap", "turkey breast", "lettuce", "tomato", "mustard"] },
    { name: "Salmon Poke Bowl", category: "lunch", calories: 520, protein: 34, carbs: 55, fat: 16, ingredients: ["sushi rice", "salmon", "avocado", "edamame", "soy sauce", "sesame seeds"] },
    { name: "Quinoa & Black Bean Bowl", category: "lunch", calories: 480, protein: 22, carbs: 65, fat: 12, ingredients: ["quinoa", "black beans", "corn", "avocado", "lime", "coriander"] },
    { name: "Tuna Salad Sandwich", category: "lunch", calories: 400, protein: 32, carbs: 35, fat: 14, ingredients: ["wholegrain bread", "tinned tuna", "greek yoghurt", "celery", "lettuce"] },
    { name: "Chicken & Rice Bowl", category: "lunch", calories: 550, protein: 40, carbs: 60, fat: 14, ingredients: ["chicken breast", "brown rice", "broccoli", "soy sauce", "sesame oil"] },
    { name: "Lentil Soup", category: "lunch", calories: 320, protein: 18, carbs: 45, fat: 6, ingredients: ["red lentils", "carrots", "onion", "garlic", "cumin", "vegetable stock"] },

    // Dinner
    { name: "Grilled Salmon with Vegetables", category: "dinner", calories: 520, protein: 40, carbs: 22, fat: 30, ingredients: ["salmon fillet", "asparagus", "sweet potato", "olive oil", "lemon"] },
    { name: "Chicken Stir-Fry", category: "dinner", calories: 480, protein: 38, carbs: 42, fat: 16, ingredients: ["chicken breast", "bell peppers", "broccoli", "soy sauce", "brown rice", "ginger"] },
    { name: "Lean Beef Mince Bolognese", category: "dinner", calories: 550, protein: 38, carbs: 55, fat: 18, ingredients: ["lean beef mince", "wholemeal pasta", "tinned tomatoes", "garlic", "onion", "basil"] },
    { name: "Baked Cod with Sweet Potato", category: "dinner", calories: 420, protein: 36, carbs: 40, fat: 10, ingredients: ["cod fillet", "sweet potato", "green beans", "lemon", "herbs"] },
    { name: "Turkey Meatballs with Rice", category: "dinner", calories: 500, protein: 40, carbs: 50, fat: 14, ingredients: ["turkey mince", "brown rice", "marinara sauce", "garlic", "parsley"] },
    { name: "Tofu & Vegetable Curry", category: "dinner", calories: 440, protein: 22, carbs: 48, fat: 18, ingredients: ["firm tofu", "coconut milk", "chickpeas", "spinach", "curry paste", "brown rice"] },
    { name: "Prawn & Courgette Pasta", category: "dinner", calories: 460, protein: 34, carbs: 50, fat: 12, ingredients: ["prawns", "wholemeal pasta", "courgette", "garlic", "cherry tomatoes", "olive oil"] },

    // Snacks
    { name: "Protein Shake", category: "snack", calories: 180, protein: 30, carbs: 8, fat: 3, ingredients: ["whey protein", "water"] },
    { name: "Apple with Peanut Butter", category: "snack", calories: 260, protein: 8, carbs: 30, fat: 14, ingredients: ["apple", "peanut butter"] },
    { name: "Mixed Nuts (40g)", category: "snack", calories: 240, protein: 8, carbs: 8, fat: 22, ingredients: ["almonds", "cashews", "walnuts"] },
    { name: "Cottage Cheese with Pineapple", category: "snack", calories: 180, protein: 20, carbs: 16, fat: 4, ingredients: ["cottage cheese", "pineapple chunks"] },
    { name: "Rice Cakes with Hummus", category: "snack", calories: 180, protein: 6, carbs: 28, fat: 6, ingredients: ["rice cakes", "hummus"] },
    { name: "Protein Bar", category: "snack", calories: 220, protein: 20, carbs: 24, fat: 8, ingredients: ["protein bar"] },
    { name: "Hard Boiled Eggs (2)", category: "snack", calories: 140, protein: 12, carbs: 1, fat: 10, ingredients: ["eggs"] },
    { name: "Edamame (100g)", category: "snack", calories: 120, protein: 12, carbs: 8, fat: 5, ingredients: ["edamame", "sea salt"] },
];

// ─── Meal plan templates ────────────────────────────────────────────────────

interface MealTemplateEntry {
    mealName: string;
    servingSize: string;
    notes?: string;
}

interface MealTemplateDay {
    dayNumber: number;
    title: string;
    entries: MealTemplateEntry[];
}

interface MealTemplate {
    title: string;
    description: string;
    tags: string[];
    days: MealTemplateDay[];
}

const mealTemplates: MealTemplate[] = [
    {
        title: "High Protein — Muscle Gain",
        description: "A 7-day high-protein meal plan designed for building lean muscle. Targets roughly 2,200 calories and 160g+ protein per day.",
        tags: ["high-protein", "bulking"],
        days: [
            {
                dayNumber: 1, title: "Day 1",
                entries: [
                    { mealName: "Scrambled Eggs (3 large)", servingSize: "1 serving" },
                    { mealName: "Protein Shake", servingSize: "1 scoop", notes: "Post-workout" },
                    { mealName: "Chicken & Rice Bowl", servingSize: "1 serving" },
                    { mealName: "Apple with Peanut Butter", servingSize: "1 serving" },
                    { mealName: "Grilled Salmon with Vegetables", servingSize: "1 serving" },
                    { mealName: "Cottage Cheese with Pineapple", servingSize: "1 serving", notes: "Before bed" },
                ],
            },
            {
                dayNumber: 2, title: "Day 2",
                entries: [
                    { mealName: "Protein Pancakes", servingSize: "1 serving" },
                    { mealName: "Hard Boiled Eggs (2)", servingSize: "1 serving" },
                    { mealName: "Grilled Chicken Salad", servingSize: "1 large" },
                    { mealName: "Protein Bar", servingSize: "1 bar" },
                    { mealName: "Turkey Meatballs with Rice", servingSize: "1 serving" },
                    { mealName: "Protein Shake", servingSize: "1 scoop" },
                ],
            },
            {
                dayNumber: 3, title: "Day 3",
                entries: [
                    { mealName: "Avocado Toast with Eggs", servingSize: "1 serving" },
                    { mealName: "Mixed Nuts (40g)", servingSize: "1 serving" },
                    { mealName: "Salmon Poke Bowl", servingSize: "1 serving" },
                    { mealName: "Protein Shake", servingSize: "1 scoop", notes: "Post-workout" },
                    { mealName: "Lean Beef Mince Bolognese", servingSize: "1 serving" },
                    { mealName: "Greek Yoghurt with Berries", servingSize: "1 serving" },
                ],
            },
            {
                dayNumber: 4, title: "Day 4",
                entries: [
                    { mealName: "Egg White Omelette", servingSize: "1 serving" },
                    { mealName: "Protein Bar", servingSize: "1 bar" },
                    { mealName: "Turkey Wrap", servingSize: "1 wrap" },
                    { mealName: "Edamame (100g)", servingSize: "1 serving" },
                    { mealName: "Chicken Stir-Fry", servingSize: "1 serving" },
                    { mealName: "Cottage Cheese with Pineapple", servingSize: "1 serving" },
                ],
            },
            {
                dayNumber: 5, title: "Day 5",
                entries: [
                    { mealName: "Protein Pancakes", servingSize: "1 serving" },
                    { mealName: "Protein Shake", servingSize: "1 scoop", notes: "Post-workout" },
                    { mealName: "Chicken & Rice Bowl", servingSize: "1 serving" },
                    { mealName: "Apple with Peanut Butter", servingSize: "1 serving" },
                    { mealName: "Grilled Salmon with Vegetables", servingSize: "1 serving" },
                    { mealName: "Hard Boiled Eggs (2)", servingSize: "1 serving" },
                ],
            },
            {
                dayNumber: 6, title: "Day 6",
                entries: [
                    { mealName: "Scrambled Eggs (3 large)", servingSize: "1 serving" },
                    { mealName: "Mixed Nuts (40g)", servingSize: "1 serving" },
                    { mealName: "Tuna Salad Sandwich", servingSize: "1 serving" },
                    { mealName: "Protein Shake", servingSize: "1 scoop" },
                    { mealName: "Prawn & Courgette Pasta", servingSize: "1 serving" },
                    { mealName: "Greek Yoghurt with Berries", servingSize: "1 serving" },
                ],
            },
            {
                dayNumber: 7, title: "Day 7",
                entries: [
                    { mealName: "Avocado Toast with Eggs", servingSize: "1 serving" },
                    { mealName: "Protein Bar", servingSize: "1 bar" },
                    { mealName: "Grilled Chicken Salad", servingSize: "1 large" },
                    { mealName: "Edamame (100g)", servingSize: "1 serving" },
                    { mealName: "Baked Cod with Sweet Potato", servingSize: "1 serving" },
                    { mealName: "Cottage Cheese with Pineapple", servingSize: "1 serving" },
                ],
            },
        ],
    },
    {
        title: "Balanced Nutrition",
        description: "A well-rounded 5-day plan balancing protein, carbs, and fats. Around 1,800–2,000 calories per day. Suitable for general fitness and weight maintenance.",
        tags: ["balanced", "general-fitness"],
        days: [
            {
                dayNumber: 1, title: "Day 1",
                entries: [
                    { mealName: "Overnight Oats", servingSize: "1 serving" },
                    { mealName: "Grilled Chicken Salad", servingSize: "1 serving" },
                    { mealName: "Apple with Peanut Butter", servingSize: "1 serving" },
                    { mealName: "Chicken Stir-Fry", servingSize: "1 serving" },
                ],
            },
            {
                dayNumber: 2, title: "Day 2",
                entries: [
                    { mealName: "Greek Yoghurt with Berries", servingSize: "1 serving" },
                    { mealName: "Quinoa & Black Bean Bowl", servingSize: "1 serving" },
                    { mealName: "Rice Cakes with Hummus", servingSize: "2 cakes" },
                    { mealName: "Grilled Salmon with Vegetables", servingSize: "1 serving" },
                ],
            },
            {
                dayNumber: 3, title: "Day 3",
                entries: [
                    { mealName: "Scrambled Eggs (3 large)", servingSize: "1 serving" },
                    { mealName: "Turkey Wrap", servingSize: "1 wrap" },
                    { mealName: "Mixed Nuts (40g)", servingSize: "1 serving" },
                    { mealName: "Lean Beef Mince Bolognese", servingSize: "1 serving" },
                ],
            },
            {
                dayNumber: 4, title: "Day 4",
                entries: [
                    { mealName: "Smoothie Bowl", servingSize: "1 serving" },
                    { mealName: "Lentil Soup", servingSize: "1 bowl" },
                    { mealName: "Hard Boiled Eggs (2)", servingSize: "1 serving" },
                    { mealName: "Baked Cod with Sweet Potato", servingSize: "1 serving" },
                ],
            },
            {
                dayNumber: 5, title: "Day 5",
                entries: [
                    { mealName: "Avocado Toast with Eggs", servingSize: "1 serving" },
                    { mealName: "Salmon Poke Bowl", servingSize: "1 serving" },
                    { mealName: "Cottage Cheese with Pineapple", servingSize: "1 serving" },
                    { mealName: "Tofu & Vegetable Curry", servingSize: "1 serving" },
                ],
            },
        ],
    },
    {
        title: "Cutting — Fat Loss",
        description: "A calorie-controlled 7-day plan for fat loss while preserving muscle. Targets 1,500–1,700 calories and 140g+ protein per day.",
        tags: ["cutting", "high-protein", "weight-loss"],
        days: [
            {
                dayNumber: 1, title: "Day 1",
                entries: [
                    { mealName: "Egg White Omelette", servingSize: "1 serving" },
                    { mealName: "Grilled Chicken Salad", servingSize: "1 serving" },
                    { mealName: "Protein Shake", servingSize: "1 scoop" },
                    { mealName: "Baked Cod with Sweet Potato", servingSize: "1 serving" },
                ],
            },
            {
                dayNumber: 2, title: "Day 2",
                entries: [
                    { mealName: "Greek Yoghurt with Berries", servingSize: "1 serving" },
                    { mealName: "Turkey Wrap", servingSize: "1 wrap" },
                    { mealName: "Edamame (100g)", servingSize: "1 serving" },
                    { mealName: "Chicken Stir-Fry", servingSize: "1 serving", notes: "Light on the rice" },
                ],
            },
            {
                dayNumber: 3, title: "Day 3",
                entries: [
                    { mealName: "Scrambled Eggs (3 large)", servingSize: "1 serving" },
                    { mealName: "Tuna Salad Sandwich", servingSize: "1 serving" },
                    { mealName: "Hard Boiled Eggs (2)", servingSize: "1 serving" },
                    { mealName: "Grilled Salmon with Vegetables", servingSize: "1 serving" },
                ],
            },
            {
                dayNumber: 4, title: "Day 4",
                entries: [
                    { mealName: "Egg White Omelette", servingSize: "1 serving" },
                    { mealName: "Lentil Soup", servingSize: "1 bowl" },
                    { mealName: "Protein Bar", servingSize: "1 bar" },
                    { mealName: "Prawn & Courgette Pasta", servingSize: "1 serving" },
                ],
            },
            {
                dayNumber: 5, title: "Day 5",
                entries: [
                    { mealName: "Greek Yoghurt with Berries", servingSize: "1 serving" },
                    { mealName: "Grilled Chicken Salad", servingSize: "1 serving" },
                    { mealName: "Protein Shake", servingSize: "1 scoop" },
                    { mealName: "Turkey Meatballs with Rice", servingSize: "1 serving", notes: "Half portion of rice" },
                ],
            },
            {
                dayNumber: 6, title: "Day 6",
                entries: [
                    { mealName: "Smoothie Bowl", servingSize: "1 serving" },
                    { mealName: "Turkey Wrap", servingSize: "1 wrap" },
                    { mealName: "Cottage Cheese with Pineapple", servingSize: "1 serving" },
                    { mealName: "Baked Cod with Sweet Potato", servingSize: "1 serving" },
                ],
            },
            {
                dayNumber: 7, title: "Day 7",
                entries: [
                    { mealName: "Avocado Toast with Eggs", servingSize: "1 serving", notes: "Half avocado" },
                    { mealName: "Salmon Poke Bowl", servingSize: "1 serving", notes: "Light on rice" },
                    { mealName: "Edamame (100g)", servingSize: "1 serving" },
                    { mealName: "Chicken Stir-Fry", servingSize: "1 serving" },
                ],
            },
        ],
    },
    {
        title: "Vegan Plan",
        description: "A plant-based 5-day meal plan. Focuses on complete proteins through food combining. Around 1,800 calories per day.",
        tags: ["vegan", "balanced"],
        days: [
            {
                dayNumber: 1, title: "Day 1",
                entries: [
                    { mealName: "Overnight Oats", servingSize: "1 serving", notes: "Use oat milk and skip honey" },
                    { mealName: "Quinoa & Black Bean Bowl", servingSize: "1 serving" },
                    { mealName: "Mixed Nuts (40g)", servingSize: "1 serving" },
                    { mealName: "Tofu & Vegetable Curry", servingSize: "1 serving" },
                ],
            },
            {
                dayNumber: 2, title: "Day 2",
                entries: [
                    { mealName: "Smoothie Bowl", servingSize: "1 serving", notes: "Use plant-based protein powder" },
                    { mealName: "Lentil Soup", servingSize: "1 large bowl" },
                    { mealName: "Edamame (100g)", servingSize: "1 serving" },
                    { mealName: "Tofu & Vegetable Curry", servingSize: "1 serving", notes: "Different vegetables" },
                ],
            },
            {
                dayNumber: 3, title: "Day 3",
                entries: [
                    { mealName: "Overnight Oats", servingSize: "1 serving", notes: "Use oat milk" },
                    { mealName: "Quinoa & Black Bean Bowl", servingSize: "1 serving" },
                    { mealName: "Rice Cakes with Hummus", servingSize: "3 cakes" },
                    { mealName: "Lentil Soup", servingSize: "1 large bowl", notes: "Serve with crusty bread" },
                ],
            },
            {
                dayNumber: 4, title: "Day 4",
                entries: [
                    { mealName: "Smoothie Bowl", servingSize: "1 serving", notes: "Use plant-based protein" },
                    { mealName: "Lentil Soup", servingSize: "1 bowl" },
                    { mealName: "Mixed Nuts (40g)", servingSize: "1 serving" },
                    { mealName: "Tofu & Vegetable Curry", servingSize: "1 serving" },
                ],
            },
            {
                dayNumber: 5, title: "Day 5",
                entries: [
                    { mealName: "Overnight Oats", servingSize: "1 serving", notes: "Add extra chia seeds" },
                    { mealName: "Quinoa & Black Bean Bowl", servingSize: "1 serving" },
                    { mealName: "Edamame (100g)", servingSize: "1 serving" },
                    { mealName: "Tofu & Vegetable Curry", servingSize: "1 serving" },
                ],
            },
        ],
    },
    {
        title: "Keto — Low Carb",
        description: "A 5-day ketogenic meal plan keeping carbs under 30g per day. High fat, moderate protein. Around 1,800 calories.",
        tags: ["keto", "low-carb", "cutting"],
        days: [
            {
                dayNumber: 1, title: "Day 1",
                entries: [
                    { mealName: "Scrambled Eggs (3 large)", servingSize: "1 serving", notes: "Add cheese and butter" },
                    { mealName: "Grilled Chicken Salad", servingSize: "1 serving", notes: "Extra olive oil, skip croutons" },
                    { mealName: "Mixed Nuts (40g)", servingSize: "1 serving" },
                    { mealName: "Grilled Salmon with Vegetables", servingSize: "1 serving", notes: "Skip sweet potato, extra asparagus" },
                ],
            },
            {
                dayNumber: 2, title: "Day 2",
                entries: [
                    { mealName: "Egg White Omelette", servingSize: "1 serving", notes: "Use whole eggs instead, add cheese" },
                    { mealName: "Tuna Salad Sandwich", servingSize: "1 serving", notes: "Lettuce wrap instead of bread" },
                    { mealName: "Hard Boiled Eggs (2)", servingSize: "1 serving" },
                    { mealName: "Chicken Stir-Fry", servingSize: "1 serving", notes: "Skip the rice, extra vegetables" },
                ],
            },
            {
                dayNumber: 3, title: "Day 3",
                entries: [
                    { mealName: "Scrambled Eggs (3 large)", servingSize: "1 serving" },
                    { mealName: "Grilled Chicken Salad", servingSize: "1 large", notes: "With avocado" },
                    { mealName: "Cottage Cheese with Pineapple", servingSize: "1 serving", notes: "Skip pineapple" },
                    { mealName: "Baked Cod with Sweet Potato", servingSize: "1 serving", notes: "Replace sweet potato with steamed broccoli" },
                ],
            },
            {
                dayNumber: 4, title: "Day 4",
                entries: [
                    { mealName: "Avocado Toast with Eggs", servingSize: "1 serving", notes: "Skip the toast, eat avocado and eggs alone" },
                    { mealName: "Turkey Wrap", servingSize: "1 serving", notes: "Lettuce wrap instead of tortilla" },
                    { mealName: "Mixed Nuts (40g)", servingSize: "1 serving" },
                    { mealName: "Prawn & Courgette Pasta", servingSize: "1 serving", notes: "Spiralised courgette only, no pasta" },
                ],
            },
            {
                dayNumber: 5, title: "Day 5",
                entries: [
                    { mealName: "Egg White Omelette", servingSize: "1 serving", notes: "Use whole eggs, add avocado" },
                    { mealName: "Grilled Chicken Salad", servingSize: "1 serving" },
                    { mealName: "Hard Boiled Eggs (2)", servingSize: "1 serving" },
                    { mealName: "Grilled Salmon with Vegetables", servingSize: "1 serving", notes: "Skip sweet potato" },
                ],
            },
        ],
    },
    {
        title: "Meal Prep Friendly",
        description: "A simple 5-day plan designed for batch cooking on Sunday. Each day uses meals that store and reheat well. Around 2,000 calories.",
        tags: ["meal-prep", "balanced", "high-protein"],
        days: [
            {
                dayNumber: 1, title: "Day 1",
                entries: [
                    { mealName: "Overnight Oats", servingSize: "1 serving", notes: "Prep 5 jars on Sunday" },
                    { mealName: "Chicken & Rice Bowl", servingSize: "1 serving", notes: "Batch cook chicken and rice" },
                    { mealName: "Protein Bar", servingSize: "1 bar" },
                    { mealName: "Lean Beef Mince Bolognese", servingSize: "1 serving", notes: "Batch cook sauce" },
                ],
            },
            {
                dayNumber: 2, title: "Day 2",
                entries: [
                    { mealName: "Overnight Oats", servingSize: "1 serving" },
                    { mealName: "Chicken & Rice Bowl", servingSize: "1 serving" },
                    { mealName: "Apple with Peanut Butter", servingSize: "1 serving" },
                    { mealName: "Turkey Meatballs with Rice", servingSize: "1 serving", notes: "Batch cook meatballs" },
                ],
            },
            {
                dayNumber: 3, title: "Day 3",
                entries: [
                    { mealName: "Overnight Oats", servingSize: "1 serving" },
                    { mealName: "Chicken & Rice Bowl", servingSize: "1 serving" },
                    { mealName: "Hard Boiled Eggs (2)", servingSize: "1 serving", notes: "Batch boil on Sunday" },
                    { mealName: "Lean Beef Mince Bolognese", servingSize: "1 serving" },
                ],
            },
            {
                dayNumber: 4, title: "Day 4",
                entries: [
                    { mealName: "Overnight Oats", servingSize: "1 serving" },
                    { mealName: "Chicken & Rice Bowl", servingSize: "1 serving" },
                    { mealName: "Protein Bar", servingSize: "1 bar" },
                    { mealName: "Turkey Meatballs with Rice", servingSize: "1 serving" },
                ],
            },
            {
                dayNumber: 5, title: "Day 5",
                entries: [
                    { mealName: "Overnight Oats", servingSize: "1 serving" },
                    { mealName: "Chicken & Rice Bowl", servingSize: "1 serving" },
                    { mealName: "Mixed Nuts (40g)", servingSize: "1 serving" },
                    { mealName: "Lean Beef Mince Bolognese", servingSize: "1 serving" },
                ],
            },
        ],
    },
];

async function main() {
    console.log("Seeding exercises...");

    for (const ex of exercises) {
        await prisma.exercise.upsert({
            where: { name: ex.name },
            update: {},
            create: ex,
        });
    }

    console.log("Seeding workout templates...");

    // Create system coach for owning templates (coachId is required on WorkoutPlan)
    await prisma.coach.upsert({
        where: { id: SYSTEM_COACH_ID },
        update: {},
        create: {
            id: SYSTEM_COACH_ID,
            email: "system@fitflow.internal",
            name: "FitFlow Templates",
        },
    });

    // Build exercise name → id lookup
    const allExercises = await prisma.exercise.findMany({ select: { id: true, name: true } });
    const exerciseLookup = new Map(allExercises.map((e) => [e.name, e.id]));

    for (const template of templates) {
        // Check if template already exists
        const existing = await prisma.workoutPlan.findFirst({
            where: { title: template.title, isTemplate: true, coachId: SYSTEM_COACH_ID },
        });

        if (existing) {
            console.log(`  Template "${template.title}" already exists, skipping.`);
            continue;
        }

        await prisma.workoutPlan.create({
            data: {
                coachId: SYSTEM_COACH_ID,
                title: template.title,
                description: template.description,
                isTemplate: true,
                tags: template.tags,
                days: {
                    create: template.days.map((day) => ({
                        dayNumber: day.dayNumber,
                        title: day.title,
                        exercises: {
                            create: day.exercises.map((ex, idx) => {
                                const exerciseId = exerciseLookup.get(ex.name);
                                if (!exerciseId) throw new Error(`Exercise "${ex.name}" not found in database`);
                                return {
                                    exerciseId,
                                    order: idx,
                                    sets: ex.sets,
                                    reps: ex.reps,
                                    rest: ex.rest,
                                    notes: ex.notes,
                                };
                            }),
                        },
                    })),
                },
            },
        });

        console.log(`  Created template: "${template.title}"`);
    }

    // ─── Seed meals ────────────────────────────────────────────────────────────

    console.log("Seeding meals...");

    for (const meal of meals) {
        await prisma.meal.upsert({
            where: { name: meal.name },
            update: {},
            create: meal,
        });
    }

    // ─── Seed meal plan templates ────────────────────────────────────────────

    console.log("Seeding meal plan templates...");

    // Build meal name → id lookup
    const allMeals = await prisma.meal.findMany({ select: { id: true, name: true } });
    const mealLookup = new Map(allMeals.map((m) => [m.name, m.id]));

    for (const template of mealTemplates) {
        const existing = await prisma.mealPlan.findFirst({
            where: { title: template.title, isTemplate: true, coachId: SYSTEM_COACH_ID },
        });

        if (existing) {
            console.log(`  Meal template "${template.title}" already exists, skipping.`);
            continue;
        }

        await prisma.mealPlan.create({
            data: {
                coachId: SYSTEM_COACH_ID,
                title: template.title,
                description: template.description,
                isTemplate: true,
                tags: template.tags,
                days: {
                    create: template.days.map((day) => ({
                        dayNumber: day.dayNumber,
                        title: day.title,
                        entries: {
                            create: day.entries.map((entry, idx) => {
                                const mealId = mealLookup.get(entry.mealName);
                                if (!mealId) throw new Error(`Meal "${entry.mealName}" not found in database`);
                                return {
                                    mealId,
                                    order: idx,
                                    servingSize: entry.servingSize,
                                    notes: entry.notes,
                                };
                            }),
                        },
                    })),
                },
            },
        });

        console.log(`  Created meal template: "${template.title}"`);
    }

    console.log("Seed complete.");
}

main()
    .catch((error) => {
        console.error("Seed failed:", error);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
