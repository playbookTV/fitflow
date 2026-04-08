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
 * Renewal Scheduler: Runs daily at 06:00 UTC.
 * Checks for active plan assignments approaching their renewal window
 * and enqueues renewal reminders at 7 days, 2 days, and 2 days post-expiry.
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

                let jobType: string | null = null;

                if (daysUntilRenewal === 7) {
                    jobType = JobType.RENEWAL_7DAY;
                } else if (daysUntilRenewal === 2) {
                    jobType = JobType.RENEWAL_2DAY;
                } else if (daysInCurrentCycle === 2) {
                    // 2 days into a new cycle (post-expiry window).
                    // Note: daysUntilRenewal === -2 was dead code — the modulo calculation
                    // (PLAN_DURATION_DAYS - daysInCurrentCycle) always yields a positive value.
                    // Only send post-expiry if no payment was made in the last cycle
                    const recentPayment = await prisma.payment.findFirst({
                        where: {
                            clientId: assignment.clientId,
                            status: "SUCCEEDED",
                            createdAt: { gte: new Date(Date.now() - PLAN_DURATION_DAYS * 24 * 60 * 60 * 1000) },
                        },
                    });

                    if (!recentPayment) {
                        jobType = JobType.RENEWAL_POST_EXPIRY;
                    }
                }

                if (jobType) {
                    console.log(
                        `[RenewalScheduler] Enqueuing ${jobType} for ${assignment.client.name} (${daysUntilRenewal} days)`
                    );

                    await renewalQueue.add(
                        jobType,
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
