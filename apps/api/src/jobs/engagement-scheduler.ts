import cron from "node-cron";
import { engagementQueue } from "../lib/queue";
import { JobType } from "../lib/types";
import { prisma } from "../lib/prisma";
import { formatSchedulerError } from "../lib/background-jobs";
import { differenceInDays, differenceInWeeks, subDays } from "date-fns";

/**
 * Engagement Scheduler: Runs daily at 21:00 UTC (evening scan).
 *
 * Performs three scans:
 * 1. Missed workout follow-up — clients who had a scheduled workout today but no WorkoutLog
 * 2. At-risk detection — 3+ missed sessions in 7 days or 5+ days no inbound message
 * 3. Re-engagement — 10+ days since last activity
 * 4. Milestone check — halfway point or programme completion
 */
export async function runEngagementScan() {
    const now = new Date();
    const today = now.getDay(); // 0 (Sun) - 6 (Sat)

    const activeAssignments = await prisma.planAssignment.findMany({
        where: { isActive: true, __unsafeGlobal: true } as never,
        include: {
            client: true,
            plan: { include: { days: true } },
        },
    });

    let missedCount = 0;
    let atRiskCount = 0;
    let reengageCount = 0;
    let milestoneCount = 0;

    for (const assignment of activeAssignments) {
        const { client } = assignment;
        const coachId = client.coachId;
        const clientId = client.id;

        // --- 1. Missed workout follow-up ---
        if (assignment.scheduleDays.includes(today)) {
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);

            const todayLog = await prisma.workoutLog.findFirst({
                where: {
                    clientId,
                    assignmentId: assignment.id,
                    createdAt: { gte: todayStart },
                    client: { coachId },
                },
            });

            if (!todayLog) {
                // Dedup: check EventLog for recent missed workout follow-up
                const recentFollowup = await prisma.eventLog.findFirst({
                    where: {
                        clientId,
                        eventType: "engagement.missed_workout_sent",
                        createdAt: { gte: subDays(now, 1) },
                    },
                });

                if (!recentFollowup) {
                    await engagementQueue.add(JobType.MISSED_WORKOUT_FOLLOWUP, {
                        clientId,
                        coachId,
                    });
                    missedCount++;
                }
            }
        }

        // --- 2 & 3. At-risk / Re-engagement detection ---
        const sevenDaysAgo = subDays(now, 7);

        // Count scheduled days in the last 7 days.
        let scheduledDaysLast7 = 0;
        for (let offset = 1; offset <= 7; offset++) {
            const checkDate = subDays(now, offset);
            const checkDayOfWeek = checkDate.getDay();
            if (assignment.scheduleDays.includes(checkDayOfWeek)) {
                scheduledDaysLast7++;
            }
        }

        const logsLast7 = await prisma.workoutLog.count({
            where: {
                clientId,
                assignmentId: assignment.id,
                createdAt: { gte: sevenDaysAgo },
                client: { coachId },
            },
        });

        const missedLast7 = scheduledDaysLast7 - logsLast7;

        const lastMessage = await prisma.message.findFirst({
            where: {
                clientId,
                client: { coachId },
                direction: "INBOUND",
            },
            orderBy: { createdAt: "desc" },
        });

        const daysSinceLastMessage = lastMessage
            ? differenceInDays(now, lastMessage.createdAt)
            : 999;

        const lastLog = await prisma.workoutLog.findFirst({
            where: { clientId, assignmentId: assignment.id, client: { coachId } },
            orderBy: { createdAt: "desc" },
        });

        const daysSinceLastLog = lastLog
            ? differenceInDays(now, lastLog.createdAt)
            : differenceInDays(now, assignment.startDate);

        const daysSinceLastActivity = Math.min(daysSinceLastMessage, daysSinceLastLog);

        if (daysSinceLastActivity >= 10) {
            const recentReengage = await prisma.eventLog.findFirst({
                where: {
                    clientId,
                    eventType: "engagement.reengagement_sent",
                    createdAt: { gte: subDays(now, 14) },
                },
            });

            if (!recentReengage) {
                await engagementQueue.add(JobType.REENGAGEMENT, {
                    clientId,
                    coachId,
                });
                reengageCount++;
            }
        } else if (missedLast7 >= 3 || daysSinceLastMessage >= 5) {
            const recentAtRisk = await prisma.eventLog.findFirst({
                where: {
                    clientId,
                    eventType: "engagement.atrisk_sent",
                    createdAt: { gte: sevenDaysAgo },
                },
            });

            if (!recentAtRisk) {
                await engagementQueue.add(JobType.ATRISK_DETECTION, {
                    clientId,
                    coachId,
                });
                atRiskCount++;
            }
        }

        // --- 4. Milestone check ---
        const daysSinceStart = differenceInDays(now, assignment.startDate);
        const totalDays = assignment.plan.days.length;
        const totalWeeks = Math.ceil(totalDays / (assignment.scheduleDays.length || 1));
        const programmeWeek = differenceInWeeks(now, assignment.startDate) + 1;
        const halfwayWeek = Math.floor(totalWeeks / 2);

        const offerName = assignment.plan.title;

        if (programmeWeek === halfwayWeek) {
            const alreadySent = await prisma.eventLog.findFirst({
                where: {
                    clientId,
                    eventType: "engagement.milestone_sent",
                    metadata: { path: ["milestoneType"], equals: "halfway" },
                },
            });

            if (!alreadySent) {
                await engagementQueue.add(JobType.MILESTONE_CHECK, {
                    clientId,
                    coachId,
                    assignmentId: assignment.id,
                    milestoneType: "halfway",
                    programmeWeek,
                    totalWeeks,
                    offerName,
                });
                milestoneCount++;
            }
        }

        if (daysSinceStart >= totalDays) {
            const alreadySent = await prisma.eventLog.findFirst({
                where: {
                    clientId,
                    eventType: "engagement.milestone_sent",
                    metadata: { path: ["milestoneType"], equals: "completion" },
                },
            });

            if (!alreadySent) {
                await engagementQueue.add(JobType.MILESTONE_CHECK, {
                    clientId,
                    coachId,
                    assignmentId: assignment.id,
                    milestoneType: "completion",
                    programmeWeek,
                    totalWeeks,
                    offerName,
                });
                milestoneCount++;
            }
        }
    }

    return { missedCount, atRiskCount, reengageCount, milestoneCount };
}

export const startEngagementScheduler = () => {
    cron.schedule("0 21 * * *", async () => {
        console.log("[EngagementScheduler] Starting daily engagement scan...");

        try {
            const { missedCount, atRiskCount, reengageCount, milestoneCount } = await runEngagementScan();

            console.log(
                `[EngagementScheduler] Done. Missed: ${missedCount}, At-risk: ${atRiskCount}, Re-engage: ${reengageCount}, Milestones: ${milestoneCount}`
            );
        } catch (error) {
            const formattedError = formatSchedulerError(error);

            if (formattedError.connectivity) {
                console.error(`[EngagementScheduler] Skipping — database unavailable: ${formattedError.message}`);
                return;
            }

            console.error("[EngagementScheduler] Error:", error);
        }
    });
};
