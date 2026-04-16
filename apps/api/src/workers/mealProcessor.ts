import { Worker, Job } from "bullmq";
import { prisma } from "../lib/prisma";
import { getChannel, getRecipientId } from "../lib/channels/channel-router";
import { connection } from "../lib/queue";
import { JobType } from "../lib/types";
import { logEvent, EventType } from "../lib/event-logger";

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
                    client: true,
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

            // Find the matching MealDay
            const matchingDay = assignment.plan.days.find((d) => d.dayNumber === mealDay);

            // Build formatted meal list
            let mealsList = "Check your dashboard for today's meals.";
            let totalProtein = 0;
            let totalCarbs = 0;
            let totalFat = 0;
            let totalCalories = 0;

            if (matchingDay?.entries && matchingDay.entries.length > 0) {
                mealsList = matchingDay.entries
                    .map((entry, i) => {
                        const m = entry.meal;
                        const parts = [`${i + 1}. ${m.category.charAt(0).toUpperCase() + m.category.slice(1)}: ${m.name}`];
                        if (m.calories) parts.push(`(${m.calories} cal)`);
                        if (entry.servingSize) parts.push(`- ${entry.servingSize}`);
                        if (entry.notes) parts.push(`- ${entry.notes}`);

                        totalProtein += m.protein || 0;
                        totalCarbs += m.carbs || 0;
                        totalFat += m.fat || 0;
                        totalCalories += m.calories || 0;

                        return parts.join(" ");
                    })
                    .join("\n");
            }

            const macrosSummary = `Protein: ${Math.round(totalProtein)}g | Carbs: ${Math.round(totalCarbs)}g | Fat: ${Math.round(totalFat)}g | ${totalCalories} cal`;
            const dashboardUrl = `${process.env.WEB_URL || "http://localhost:3000"}/dashboard`;

            const result = await channel.sendMeal?.(recipientId, {
                clientId: client.id,
                clientName: client.name,
                planTitle: assignment.plan.title,
                dayNumber: mealDay,
                mealsList,
                macrosSummary,
                dashboardUrl,
            });

            if (result?.success) {
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
            }

            console.log(`[MealWorker] Job ${job.id} completed`);
        } catch (error) {
            console.error(`[MealWorker] Error processing job ${job.id}:`, error);
            throw error;
        }
    },
    { connection, concurrency: 5 }
);

mealWorker.on("failed", (job, err) => {
    console.error(`[MealWorker] Job ${job?.id} failed:`, err.message);
});
