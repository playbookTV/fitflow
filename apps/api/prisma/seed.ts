import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

console.log("Seeding exercises...");

try {
    for (const ex of exercises) {
        await prisma.exercise.upsert({
            where: { name: ex.name },
            update: {},
            create: ex,
        });
    }
    console.log("Seed complete.");
} catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
} finally {
    await prisma.$disconnect();
}
