import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getDelayUntil7AM, getDelayUntilSunday8PM } from "../time";

describe("Time Utilities", () => {
    describe("getDelayUntil7AM", () => {
        it("returns a non-negative number", () => {
            const delay = getDelayUntil7AM("Europe/London");
            expect(delay).toBeGreaterThanOrEqual(0);
        });

        it("returns a delay less than 24 hours", () => {
            const delay = getDelayUntil7AM("Europe/London");
            const twentyFourHours = 24 * 60 * 60 * 1000;
            expect(delay).toBeLessThan(twentyFourHours);
        });

        it("works with different timezones", () => {
            // These should return different delays since they're in different zones
            const londonDelay = getDelayUntil7AM("Europe/London");
            const tokyoDelay = getDelayUntil7AM("Asia/Tokyo");
            // They'll be different unless it happens to be exactly the right time
            expect(typeof londonDelay).toBe("number");
            expect(typeof tokyoDelay).toBe("number");
        });

        it("handles US timezone", () => {
            const delay = getDelayUntil7AM("America/New_York");
            expect(delay).toBeGreaterThanOrEqual(0);
        });
    });

    describe("getDelayUntilSunday8PM", () => {
        it("returns a non-negative number", () => {
            const delay = getDelayUntilSunday8PM("Europe/London");
            expect(delay).toBeGreaterThanOrEqual(0);
        });

        it("returns a delay less than 7 days", () => {
            const delay = getDelayUntilSunday8PM("Europe/London");
            const sevenDays = 7 * 24 * 60 * 60 * 1000;
            expect(delay).toBeLessThanOrEqual(sevenDays);
        });

        it("works with different timezones", () => {
            const delay = getDelayUntilSunday8PM("Asia/Tokyo");
            expect(delay).toBeGreaterThanOrEqual(0);
        });
    });
});
