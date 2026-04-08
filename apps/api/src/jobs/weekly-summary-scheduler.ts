import cron from "node-cron";
import { engagementQueue } from "../lib/queue";
import { JobType } from "../lib/types";
import { prisma } from "../lib/prisma";
import { formatSchedulerError } from "../lib/background-jobs";
import { subDays, differenceInWeeks } from "date-fns";

/**
 * Weekly Summary Scheduler: Runs Sunday at 18:00 UTC.
 * Aggregates the week's workout stats for each active assignment and enqueues WEEK_SUMMARY.
 */
export const startWeeklySummaryScheduler = () => {
    cron.schedule("0 18 * * 0", async () => {
        console.log("[WeeklySummary] Starting weekly summary enqueuing...");

        try {
            const now = new Date();
            const weekStart = subDays(now, 7);

            const activeAssignments = await prisma.planAssignment.findMany({
                where: { isActive: true },
                include: {
                    client: true,
                    plan: { include: { days: true } },
                },
            });

            let enqueuedCount = 0;

            for (const assignment of activeAssignments) {
                const { client } = assignment;

                // Count scheduled days this week
                const sessionsScheduled = assignment.scheduleDays.length;

                // Count workout logs this week
                const logs = await prisma.workoutLog.findMany({
                    where: {
                        clientId: client.id,
                        assignmentId: assignment.id,
                        createdAt: { gte: weekStart },
                    },
                });

                const sessionsCompleted = logs.filter(l => l.status === "COMPLETED").length;
                const sessionsSkipped = logs.filter(l => l.status === "SKIPPED").length;
                const consistencyRate = sessionsScheduled > 0
                    ? Math.round((sessionsCompleted / sessionsScheduled) * 100)
                    : 0;

                const totalWeeks = Math.ceil(
                    assignment.plan.days.length / (assignment.scheduleDays.length || 1)
                );
                const programmeWeek = differenceInWeeks(now, assignment.startDate) + 1;

                await engagementQueue.add(JobType.WEEK_SUMMARY, {
                    clientId: client.id,
                    coachId: client.coachId,
                    programmeWeek,
                    totalWeeks,
                    sessionsCompleted,
                    sessionsSkipped,
                    sessionsScheduled,
                    consistencyRate,
                });

                enqueuedCount++;
            }

            console.log(`[WeeklySummary] Enqueued ${enqueuedCount} week summaries.`);
        } catch (error) {
            const formattedError = formatSchedulerError(error);

            if (formattedError.connectivity) {
                console.error(`[WeeklySummary] Skipping — database unavailable: ${formattedError.message}`);
                return;
            }

            console.error("[WeeklySummary] Error:", error);
        }
    });
};
