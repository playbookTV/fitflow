import cron from "node-cron";
import { mealQueue } from "../lib/queue";
import { getDelayUntil7AM } from "../lib/time";
import { JobType } from "../lib/types";
import { prisma } from "../lib/prisma";
import { formatSchedulerError } from "../lib/background-jobs";

/**
 * Daily Meal Scheduler: Runs at 00:01 every day.
 * Identifies clients with active meal plans scheduled for today and enqueues meal delivery.
 */
export const startDailyMealScheduler = () => {
    cron.schedule("1 0 * * *", async () => {
        console.log("[MealScheduler] Starting daily meal enqueuing...");

        try {
            const today = new Date();
            const dayOfWeek = today.getDay();

            const activeAssignments = await prisma.mealAssignment.findMany({
                where: { isActive: true },
                include: {
                    client: true,
                    plan: true,
                },
            });

            for (const assignment of activeAssignments) {
                if (assignment.scheduleDays.includes(dayOfWeek)) {
                    const timezone = assignment.client.timezone || "Europe/London";
                    const delay = getDelayUntil7AM(timezone);

                    const diffInMs = today.getTime() - assignment.startDate.getTime();
                    const currentWeek = Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 7));

                    console.log(`[MealScheduler] Enqueuing meal for ${assignment.client.name} with delay ${delay}ms`);

                    await mealQueue.add(
                        JobType.MEAL_DELIVERY,
                        {
                            clientId: assignment.clientId,
                            assignmentId: assignment.id,
                            dayNumber: (currentWeek * 7) + dayOfWeek,
                        },
                        { delay }
                    );
                }
            }
            console.log("[MealScheduler] Daily meal enqueuing complete.");
        } catch (error) {
            const formattedError = formatSchedulerError(error);

            if (formattedError.connectivity) {
                console.error(`[MealScheduler] Skipping run because the database is unavailable: ${formattedError.message}`);
                return;
            }

            console.error("[MealScheduler] Error running meal scheduler:", error);
        }
    });
};
