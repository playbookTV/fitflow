import cron from "node-cron";
import { workoutQueue } from "../lib/queue";
import { getDelayUntil7AM } from "../lib/time";
import { JobType } from "../lib/types";
import { prisma } from "../lib/prisma";
import { formatSchedulerError } from "../lib/background-jobs";

/**
 * Daily Scheduler: Runs at 00:01 every day.
 * Identifies clients with active plans scheduled for today and enqueues workout delivery.
 */
export const startDailyScheduler = () => {
    // Schedule for 00:01 every day
    cron.schedule("1 0 * * *", async () => {
        console.log("[DailyScheduler] Starting daily workout enqueuing...");

        try {
            const today = new Date();
            const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)

            // Find all active plan assignments
            const activeAssignments = await prisma.planAssignment.findMany({
                where: { isActive: true },
                include: {
                    client: true,
                    plan: true
                }
            });

            for (const assignment of activeAssignments) {
                // Check if the plan is scheduled for today
                if (assignment.scheduleDays.includes(dayOfWeek)) {
                    const timezone = assignment.client.timezone || "Europe/London";
                    const delay = getDelayUntil7AM(timezone);

                    // Calculate current week (0-indexed)
                    const diffInMs = today.getTime() - assignment.startDate.getTime();
                    const currentWeek = Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 7));

                    console.log(`[DailyScheduler] Enqueuing workout for ${assignment.client.name} with delay ${delay}ms`);

                    await workoutQueue.add(
                        JobType.WORKOUT_DELIVERY,
                        {
                            clientId: assignment.clientId,
                            assignmentId: assignment.id,
                            dayNumber: (currentWeek * 7) + dayOfWeek
                        },
                        { delay }
                    );
                }
            }
            console.log("[DailyScheduler] Daily enqueuing complete.");
        } catch (error) {
            const formattedError = formatSchedulerError(error);

            if (formattedError.connectivity) {
                console.error(`[DailyScheduler] Skipping run because the database is unavailable: ${formattedError.message}`);
                return;
            }

            console.error("[DailyScheduler] Error running daily scheduler:", error);
        }
    });
};
