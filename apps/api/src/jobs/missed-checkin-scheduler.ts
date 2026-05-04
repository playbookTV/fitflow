import cron from "node-cron";
import { engagementQueue } from "../lib/queue";
import { JobType } from "../lib/types";
import { prisma } from "../lib/prisma";
import { env } from "../lib/env";
import { formatSchedulerError } from "../lib/background-jobs";
import { subDays, differenceInWeeks } from "date-fns";

/**
 * Missed Check-in Scheduler: Runs Monday at 10:00 UTC.
 * 24h+ after Sunday check-in prompts — finds clients who received a prompt but haven't checked in.
 */
export const startMissedCheckinScheduler = () => {
    cron.schedule("0 10 * * 1", async () => {
        console.log("[MissedCheckin] Starting missed check-in scan...");

        try {
            const now = new Date();
            const weekStart = subDays(now, 7);

            // Find clients who were sent a check-in prompt this week
            const sentEvents = await prisma.eventLog.findMany({
                where: {
                    eventType: "checkin.sent",
                    createdAt: { gte: weekStart },
                },
                select: { clientId: true },
            });

            const clientIds = [...new Set(sentEvents.map(e => e.clientId).filter(Boolean))] as string[];

            let enqueuedCount = 0;

            for (const clientId of clientIds) {
                // Check if client has a CheckIn record this week
                const recentCheckin = await prisma.checkIn.findFirst({
                    where: {
                        clientId,
                        createdAt: { gte: weekStart },
                    },
                });

                if (!recentCheckin) {
                    const client = await prisma.client.findUnique({
                        where: { id: clientId },
                    });

                    if (!client) continue;

                    const assignment = await prisma.planAssignment.findFirst({
                        where: { clientId, isActive: true },
                        include: { plan: { include: { days: true } } },
                    });

                    const totalWeeks = assignment
                        ? Math.ceil(assignment.plan.days.length / (assignment.scheduleDays.length || 1))
                        : 12;
                    const programmeWeek = assignment
                        ? differenceInWeeks(now, assignment.startDate) + 1
                        : 1;

                    const checkinLink = `${env.WEB_URL}/dashboard/checkin`;

                    await engagementQueue.add(JobType.MISSED_CHECKIN_NUDGE, {
                        clientId,
                        coachId: client.coachId,
                        programmeWeek,
                        checkinLink,
                    });

                    enqueuedCount++;
                }
            }

            console.log(`[MissedCheckin] Enqueued ${enqueuedCount} missed check-in nudges.`);
        } catch (error) {
            const formattedError = formatSchedulerError(error);

            if (formattedError.connectivity) {
                console.error(`[MissedCheckin] Skipping — database unavailable: ${formattedError.message}`);
                return;
            }

            console.error("[MissedCheckin] Error:", error);
        }
    });
};
