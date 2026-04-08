import cron from "node-cron";
import { renewalQueue } from "../lib/queue";
import { JobType } from "../lib/types";
import { differenceInDays } from "date-fns";
import { prisma } from "../lib/prisma";
import { formatSchedulerError } from "../lib/background-jobs";

/**
 * Default plan duration in days.
 * Plans don't have an explicit end date in the model,
 * so we use a 30-day cycle for renewal reminders.
 */
const PLAN_DURATION_DAYS = 30;

/**
 * Days before expiry to send a renewal reminder.
 */
const REMINDER_DAYS_BEFORE = 3;

/**
 * Renewal Scheduler: Runs daily at 06:00 UTC.
 * Checks for active plan assignments approaching their renewal window
 * and enqueues renewal reminders via the client's preferred channel.
 */
export const startRenewalScheduler = () => {
    cron.schedule("0 6 * * *", async () => {
        console.log("[RenewalScheduler] Starting renewal check...");

        try {
            const activeAssignments = await prisma.planAssignment.findMany({
                where: { isActive: true },
                include: {
                    client: true,
                    plan: true,
                },
            });

            let enqueuedCount = 0;

            for (const assignment of activeAssignments) {
                const daysSinceStart = differenceInDays(new Date(), assignment.startDate);
                const daysInCurrentCycle = daysSinceStart % PLAN_DURATION_DAYS;
                const daysUntilRenewal = PLAN_DURATION_DAYS - daysInCurrentCycle;

                // Send reminder when within the reminder window
                if (daysUntilRenewal <= REMINDER_DAYS_BEFORE && daysUntilRenewal > 0) {
                    console.log(
                        `[RenewalScheduler] Enqueuing renewal reminder for ${assignment.client.name} (${daysUntilRenewal} days left)`
                    );

                    await renewalQueue.add(
                        JobType.RENEWAL_REMINDER,
                        {
                            clientId: assignment.clientId,
                            coachId: assignment.client.coachId,
                            planTitle: assignment.plan.title,
                            daysUntilRenewal,
                        },
                    );

                    enqueuedCount++;
                }
            }

            console.log(`[RenewalScheduler] Enqueued ${enqueuedCount} renewal reminders.`);
        } catch (error) {
            const formattedError = formatSchedulerError(error);

            if (formattedError.connectivity) {
                console.error(`[RenewalScheduler] Skipping run because the database is unavailable: ${formattedError.message}`);
                return;
            }

            console.error("[RenewalScheduler] Error:", error);
        }
    });
};
