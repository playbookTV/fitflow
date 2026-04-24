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

    console.log("Seed complete.");
}

main()
    .catch((error) => {
        console.error("Seed failed:", error);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
