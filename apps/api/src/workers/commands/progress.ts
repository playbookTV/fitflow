import { prisma } from "../../lib/prisma";
import { differenceInWeeks } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/**
 * Calculate consecutive completed workouts from most recent backwards.
 */
async function getStreak(assignmentId: string): Promise<number> {
    const logs = await prisma.workoutLog.findMany({
        where: { assignmentId },
        orderBy: { createdAt: "desc" },
        select: { status: true },
        take: 50,
    });

    let streak = 0;
    for (const log of logs) {
        if (log.status === "COMPLETED") streak++;
        else break;
    }
    return streak;
}

/**
 * Find the next scheduled workout day name from today.
 * scheduleDays uses 1=Mon...7=Sun, JS getDay uses 0=Sun...6=Sat.
 */
function getNextWorkoutDay(scheduleDays: number[], timezone: string): string {
    const now = toZonedTime(new Date(), timezone);
    // Convert JS day (0=Sun) to schedule format (1=Mon...7=Sun)
    const jsDay = now.getDay();
    const todaySchedule = jsDay === 0 ? 7 : jsDay;

    // Find next scheduled day (including today)
    const sorted = [...scheduleDays].sort((a, b) => a - b);
    const upcoming = sorted.find((d) => d >= todaySchedule) ?? sorted[0];

    // Convert back to JS day name (1=Mon→1, 7=Sun→0)
    const jsDayIndex = upcoming === 7 ? 0 : upcoming;
    return DAY_NAMES[jsDayIndex];
}

export async function progressCommand(clientId: string): Promise<string> {
    const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { timezone: true },
    });

    const assignment = await prisma.planAssignment.findFirst({
        where: { clientId, isActive: true },
        include: { plan: { include: { days: true } } },
    });

    if (!assignment) {
        return "You don't have an active plan right now.";
    }

    const timezone = client?.timezone || "UTC";
    const currentWeek = Math.max(1, differenceInWeeks(new Date(), assignment.startDate) + 1);
    const totalWeeks = Math.ceil(
        assignment.plan.days.length / Math.max(assignment.scheduleDays.length, 1)
    );
    const streak = await getStreak(assignment.id);
    const nextDay = assignment.scheduleDays.length > 0
        ? getNextWorkoutDay(assignment.scheduleDays, timezone)
        : "TBD";

    return [
        "YOUR PROGRESS",
        "",
        `Plan: ${assignment.plan.title}`,
        `Week: ${currentWeek} of ${totalWeeks}`,
        `Compliance: ${assignment.compliance}%`,
        `Streak: ${streak} workout${streak === 1 ? "" : "s"}`,
        `Next workout: ${nextDay}`,
    ].join("\n");
}
