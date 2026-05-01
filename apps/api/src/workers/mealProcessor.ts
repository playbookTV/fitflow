import { Worker, Job } from "bullmq";
import { TemplateId } from "@fitflow/shared";
import { prisma } from "../lib/prisma";
import { getChannel, getRecipientId } from "../lib/channels/channel-router";
import { connection } from "../lib/queue";
import { JobType } from "../lib/types";
import { logEvent, EventType } from "../lib/event-logger";
import { assertSendSuccess } from "./assert-send";

const CATEGORY_ORDER = ["breakfast", "snack", "lunch", "dinner"] as const;

interface MealEntryWithMeal {
    meal: {
        name: string;
        category: string;
        protein: number | null;
        carbs: number | null;
        fat: number | null;
        calories: number | null;
        prepTime: string | null;
    };
    servingSize: string | null;
    notes: string | null;
}

function buildGroupedMealsList(entries: MealEntryWithMeal[]) {
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalCalories = 0;
    let totalPrepMinutes = 0;

    // Group entries by category, preserving order within each group
    const grouped = new Map<string, MealEntryWithMeal[]>();
    for (const entry of entries) {
        const cat = entry.meal.category.toLowerCase();
        if (!grouped.has(cat)) grouped.set(cat, []);
        grouped.get(cat)!.push(entry);

        totalProtein += entry.meal.protein || 0;
        totalCarbs += entry.meal.carbs || 0;
        totalFat += entry.meal.fat || 0;
        totalCalories += entry.meal.calories || 0;

        if (entry.meal.prepTime) {
            const mins = Number.parseInt(entry.meal.prepTime, 10);
            if (!Number.isNaN(mins)) totalPrepMinutes += mins;
        }
    }

    // Render groups in display order
    const sections: string[] = [];
    for (const cat of CATEGORY_ORDER) {
        const catEntries = grouped.get(cat);
        if (!catEntries) continue;

        const label = cat.charAt(0).toUpperCase() + cat.slice(1);
        const lines = catEntries.map((entry) => {
            const m = entry.meal;
            let line = `  ${m.name}`;
            if (m.calories) line += ` \u2014 ${m.calories} cal`;
            if (entry.servingSize) line += ` (${entry.servingSize})`;
            if (entry.notes) line += ` — ${entry.notes}`;
            return line;
        });
        sections.push(`${label}: ${lines.join(", ")}`);
    }

    return {
        mealsList: sections.join(" | "),
        protein: Math.round(totalProtein),
        carbs: Math.round(totalCarbs),
        fat: Math.round(totalFat),
        calories: totalCalories,
        totalPrepTime: totalPrepMinutes > 0 ? `~${totalPrepMinutes} min` : "",
    };
}

/**
 * Worker to process meal plan delivery.
 */
export const mealWorker = new Worker(
    "meal-delivery",
    async (job: Job) => {
        const { clientId, assignmentId, dayNumber } = job.data;

        console.log(`[MealWorker] Processing ${job.name} for client ${clientId}`);

        try {
            if (job.name !== JobType.MEAL_DELIVERY) return;

            const assignment = await prisma.mealAssignment.findUnique({
                where: { id: assignmentId },
                include: {
                    plan: {
                        include: {
                            days: {
                                include: {
                                    entries: {
                                        include: { meal: true },
                                        orderBy: { order: "asc" },
                                    },
                                },
                            },
                        },
                    },
                    client: {
                        include: { coach: true },
                    },
                },
            });

            if (!assignment?.isActive) {
                console.log(`[MealWorker] Assignment ${assignmentId} inactive/missing. Skipping.`);
                return;
            }

            const { client } = assignment;
            const channel = await getChannel(client.preferredChannel, client.coachId);
            const recipientId = getRecipientId(client);
            const mealDay = (dayNumber % 7) || 7;

            const matchingDay = assignment.plan.days.find((d) => d.dayNumber === mealDay);

            const hasEntries = matchingDay?.entries && matchingDay.entries.length > 0;
            const mealData = hasEntries
                ? buildGroupedMealsList(matchingDay.entries)
                : { mealsList: "Check your dashboard for today's meals.", protein: 0, carbs: 0, fat: 0, calories: 0, totalPrepTime: "" };

            const clientFirstName = client.name.split(" ")[0];

            const macrosSummary = `Protein: ${mealData.protein}g | Carbs: ${mealData.carbs}g | Fat: ${mealData.fat}g | ${mealData.calories} cal`;

            const result = await channel.sendTemplate(recipientId, TemplateId.MEAL_DAILY, {
                client_first_name: clientFirstName,
                day_number: mealDay,
                day_title: matchingDay?.title || "",
                plan_title: assignment.plan.title,
                meals_list: mealData.mealsList,
                macros_summary: macrosSummary,
                protein: mealData.protein,
                carbs: mealData.carbs,
                fat: mealData.fat,
                calories: mealData.calories,
                total_prep_time: mealData.totalPrepTime,
                compliance: assignment.compliance,
            }, client.id);

            assertSendSuccess(result, `Meal delivery for client ${clientId}`);

            await logEvent(EventType.MEAL_DELIVERED, {
                coachId: client.coachId,
                clientId: client.id,
                channel: client.preferredChannel,
                metadata: {
                    planTitle: assignment.plan.title,
                    dayNumber: mealDay,
                    assignmentId,
                },
            });

            console.log(`[MealWorker] Job ${job.id} completed`);
        } catch (error) {
            console.error(`[MealWorker] Error processing job ${job.id}:`, error);
            throw error;
        }
    },
    { connection, concurrency: 5 }
);

import { captureWorkerFailure } from "../lib/sentry";
mealWorker.on("failed", (job, err) => {
    console.error(`[MealWorker] Job ${job?.id} failed:`, err.message);
    captureWorkerFailure("mealWorker", err, { jobId: job?.id, jobName: job?.name });
});
