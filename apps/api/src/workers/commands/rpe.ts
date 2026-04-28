import { prisma } from "../../lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

export async function rpeCommand(clientId: string, rawValue: string): Promise<string> {
    const rpe = parseInt(rawValue, 10);
    if (!Number.isFinite(rpe) || rpe < 1 || rpe > 10) {
        return "RPE must be between 1 and 10. Try: RPE 7";
    }

    // Get client timezone for "today" boundary
    const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { timezone: true },
    });
    const timezone = client?.timezone || "UTC";

    const nowInTz = toZonedTime(new Date(), timezone);
    const todayStart = fromZonedTime(startOfDay(nowInTz), timezone);
    const todayEnd = fromZonedTime(endOfDay(nowInTz), timezone);

    const log = await prisma.workoutLog.findFirst({
        where: {
            clientId,
            createdAt: { gte: todayStart, lte: todayEnd },
        },
        orderBy: { createdAt: "desc" },
    });

    if (!log) {
        return "No workout logged today. Send DONE first, then rate it with RPE.";
    }

    const rpeNote = `RPE: ${rpe}`;
    const updatedNotes = log.notes ? `${log.notes} | ${rpeNote}` : rpeNote;

    await prisma.workoutLog.update({
        where: { id: log.id },
        data: { notes: updatedNotes },
    });

    return `RPE ${rpe} recorded for today's workout.`;
}
