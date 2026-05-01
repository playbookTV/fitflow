import { formatInTimeZone, toDate } from "date-fns-tz";
import { addDays, differenceInMilliseconds, isBefore } from "date-fns";

const pad = (n: number) => n.toString().padStart(2, "0");

/**
 * Calculates the millisecond delay from now until the given hour:minute in the target timezone.
 * If that time has already passed today, schedules for the same time tomorrow.
 */
export const getDelayUntilHour = (
    hour: number,
    minute: number,
    timezone: string
): number => {
    const now = new Date();
    const datePart = formatInTimeZone(now, timezone, "yyyy-MM-dd");
    let target = toDate(`${datePart}T${pad(hour)}:${pad(minute)}:00`, { timeZone: timezone });

    if (isBefore(target, now)) {
        target = addDays(target, 1);
    }

    return Math.max(0, differenceInMilliseconds(target, now));
};

/**
 * Calculates the millisecond delay from now until 7 AM in the target timezone.
 */
export const getDelayUntil7AM = (timezone: string): number =>
    getDelayUntilHour(7, 0, timezone);

/**
 * Calculates the millisecond delay until 8 PM this coming Sunday in the target timezone.
 */
export const getDelayUntilSunday8PM = (timezone: string): number => {
    const now = new Date();

    // Find next Sunday
    const daysToSunday = (7 - now.getDay()) % 7;
    const sunday = addDays(now, daysToSunday);

    let target = toDate(formatInTimeZone(sunday, timezone, "yyyy-MM-dd'T'20:00:00"), { timeZone: timezone });

    if (isBefore(target, now)) {
        target = addDays(target, 7);
    }

    return Math.max(0, differenceInMilliseconds(target, now));
};
