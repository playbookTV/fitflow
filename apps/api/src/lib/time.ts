import { formatInTimeZone, toDate } from "date-fns-tz";
import { addDays, differenceInMilliseconds, isBefore } from "date-fns";

/**
 * Calculates the millisecond delay from now until 7 AM in the target timezone.
 * If 7 AM today has already passed, it calculates for 7 AM tomorrow.
 */
export const getDelayUntil7AM = (timezone: string): number => {
    const now = new Date();

    // Get 7 AM today in the target timezone
    let target = toDate(formatInTimeZone(now, timezone, "yyyy-MM-dd'T'07:00:00"), { timeZone: timezone });

    // If 7 AM today is already in the past, set target to 7 AM tomorrow
    if (isBefore(target, now)) {
        target = addDays(target, 1);
    }

    return Math.max(0, differenceInMilliseconds(target, now));
};

/**
 * Calculates the millisecond delay until 8 PM this coming Sunday in the target timezone.
 */
export const getDelayUntilSunday8PM = (timezone: string): number => {
    const now = new Date();

    // Find next Sunday
    let daysToSunday = (7 - now.getDay()) % 7;
    let sunday = addDays(now, daysToSunday);

    let target = toDate(formatInTimeZone(sunday, timezone, "yyyy-MM-dd'T'20:00:00"), { timeZone: timezone });

    if (isBefore(target, now)) {
        target = addDays(target, 7);
    }

    return Math.max(0, differenceInMilliseconds(target, now));
};
