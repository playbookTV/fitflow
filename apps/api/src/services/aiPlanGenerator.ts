import { prisma } from "../lib/prisma";
import { env } from "../lib/env";

interface GenerateParams {
    coachId: string;
    clientId?: string;
    instructions?: string;
}

interface GeneratedExercise {
    exerciseId: string;
    exerciseName: string;
    sets: number;
    reps: string;
    rest: string;
    notes: string;
}

interface GeneratedDay {
    dayNumber: number;
    title: string;
    exercises: GeneratedExercise[];
}

interface GeneratedPlan {
    title: string;
    description: string;
    days: GeneratedDay[];
}

export async function generatePlan({ coachId, clientId, instructions }: GenerateParams): Promise<GeneratedPlan> {
    // Fetch exercise catalog
    const exercises = await prisma.exercise.findMany({
        select: { id: true, name: true, category: true, muscles: true },
        orderBy: { name: "asc" },
        take: 2000,
    });

    if (exercises.length === 0) {
        throw new PlanGenerationError("No exercises found in the library. Add exercises before generating a plan.", 422);
    }

    // Build exercise catalog for the prompt
    const exerciseCatalog = exercises.map((e) => ({
        id: e.id,
        name: e.name,
        category: e.category,
        muscles: e.muscles,
    }));
    const exerciseIdSet = new Set(exercises.map((e) => e.id));
    const exerciseNameMap = new Map(exercises.map((e) => [e.id, e.name]));

    // Fetch client context if provided
    let clientContext = "";
    if (clientId) {
        const client = await prisma.client.findFirst({
            where: { id: clientId, coachId },
            select: {
                name: true,
                goals: true,
                notes: true,
                checkIns: {
                    orderBy: { createdAt: "desc" },
                    take: 10,
                    select: { weight: true, energy: true, sleep: true, createdAt: true },
                },
                workoutLogs: {
                    orderBy: { createdAt: "desc" },
                    take: 10,
                    select: { status: true, dayNumber: true },
                },
                assignments: {
                    where: { isActive: true },
                    include: {
                        plan: {
                            select: { title: true, days: { select: { title: true, exercises: { select: { exercise: { select: { name: true } } } } } } },
                        },
                    },
                    take: 1,
                },
            },
        });

        if (!client) {
            throw new PlanGenerationError("Client not found or does not belong to this coach.", 404);
        }

        const recentEnergy = client.checkIns
            .filter((c) => c.energy != null)
            .map((c) => c.energy);
        const avgEnergy = recentEnergy.length > 0
            ? (recentEnergy.reduce((a, b) => a! + b!, 0)! / recentEnergy.length).toFixed(1)
            : "N/A";

        const completionRate = client.workoutLogs.length > 0
            ? Math.round((client.workoutLogs.filter((l) => l.status === "COMPLETED").length / client.workoutLogs.length) * 100)
            : null;

        const currentPlan = client.assignments[0]?.plan;
        const currentPlanSummary = currentPlan
            ? `Current plan: "${currentPlan.title}" (${currentPlan.days.length} days). Avoid duplicating this plan.`
            : "No current plan assigned.";

        clientContext = `
CLIENT PROFILE:
- Name: ${client.name}
- Goals: ${client.goals || "Not specified"}
- Coach notes: ${client.notes || "None"}
- Average energy (last 10 check-ins): ${avgEnergy}/5
- Workout completion rate (last 10 sessions): ${completionRate != null ? `${completionRate}%` : "No data"}
- ${currentPlanSummary}`;
    }

    const systemPrompt = `You are a workout plan designer for a personal training coaching app.
Generate a structured workout plan using ONLY exercise IDs from the provided catalog.
Return ONLY valid JSON matching the schema below. No markdown, no explanation, no wrapping.

OUTPUT SCHEMA:
{
  "title": string (max 200 chars),
  "description": string (max 2000 chars, brief plan overview),
  "days": [
    {
      "dayNumber": number (1-14),
      "title": string (e.g. "Upper Body Push", "Leg Day"),
      "exercises": [
        {
          "exerciseId": string (MUST be from the catalog),
          "sets": number (1-10),
          "reps": string (e.g. "8-10", "12", "AMRAP"),
          "rest": string (e.g. "60s", "90s", "2:00"),
          "notes": string (brief coaching cue, optional)
        }
      ]
    }
  ]
}

RULES:
- Every exerciseId MUST come from the EXERCISE CATALOG below. Never invent IDs.
- Each day should have 4-8 exercises.
- Include warm-up movements where appropriate.
- Use progressive overload principles.
- Vary rep ranges based on exercise type (compound vs isolation).`;

    const userMessage = `EXERCISE CATALOG:
${JSON.stringify(exerciseCatalog)}

${clientContext ? clientContext : "No specific client selected. Generate a general-purpose plan."}

${instructions ? `COACH INSTRUCTIONS: ${instructions}` : "Generate a balanced 3-day full-body workout plan."}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let res: Response;
    try {
        res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": env.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 4000,
                system: systemPrompt,
                messages: [{ role: "user", content: userMessage }],
            }),
            signal: controller.signal,
        });
    } catch (err: any) {
        if (err.name === "AbortError") {
            throw new PlanGenerationError("AI generation timed out. Please try again.", 504);
        }
        throw new PlanGenerationError("Failed to reach AI service. Please try again.", 502);
    } finally {
        clearTimeout(timeout);
    }

    if (!res.ok) {
        throw new PlanGenerationError("AI service returned an error. Please try again.", 502);
    }

    const data = await res.json();
    let plan: GeneratedPlan;
    try {
        plan = JSON.parse(data.content[0].text);
    } catch {
        throw new PlanGenerationError("AI generated an invalid response. Please try again or adjust your instructions.", 502);
    }

    // Validate and sanitize: strip invalid exercise IDs, enrich with names
    plan.days = plan.days
        .map((day) => ({
            ...day,
            exercises: day.exercises
                .filter((ex) => exerciseIdSet.has(ex.exerciseId))
                .map((ex) => ({
                    ...ex,
                    exerciseName: exerciseNameMap.get(ex.exerciseId) || "Unknown",
                    sets: Math.max(1, Math.min(100, Math.round(ex.sets || 3))),
                    reps: String(ex.reps || "10-12").slice(0, 50),
                    rest: String(ex.rest || "60s").slice(0, 50),
                    notes: String(ex.notes || "").slice(0, 500),
                })),
        }))
        .filter((day) => day.exercises.length > 0);

    if (plan.days.length === 0) {
        throw new PlanGenerationError("Could not find matching exercises. Try broader instructions.", 422);
    }

    // Ensure dayNumbers are sequential
    plan.days = plan.days.map((day, idx) => ({
        ...day,
        dayNumber: idx + 1,
    }));

    return {
        title: String(plan.title || "AI Generated Plan").slice(0, 200),
        description: String(plan.description || "").slice(0, 2000),
        days: plan.days,
    };
}

export class PlanGenerationError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
        super(message);
        this.name = "PlanGenerationError";
        this.statusCode = statusCode;
    }
}
