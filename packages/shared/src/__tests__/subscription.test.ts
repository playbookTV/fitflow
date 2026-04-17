import { describe, it, expect } from "vitest";
import {
    TIER_LIMITS,
    TIER_PRICING,
    TIER_ORDER,
    TRIAL_DAYS,
    type SubscriptionTier,
} from "../subscription";

describe("Subscription Tier Configuration", () => {
    describe("TIER_LIMITS", () => {
        it("has entries for all three tiers", () => {
            expect(Object.keys(TIER_LIMITS)).toEqual(["STARTER", "PRO", "STUDIO"]);
        });

        it("STARTER has the most restrictive limits", () => {
            const s = TIER_LIMITS.STARTER;
            expect(s.maxClients).toBe(10);
            expect(s.maxChannels).toBe(1);
            expect(s.maxBots).toBe(1);
            expect(s.analytics).toBe(false);
            expect(s.paymentCollection).toBe(false);
            expect(s.checkinSequences).toBe(false);
            expect(s.whiteLabel).toBe(false);
        });

        it("PRO has more generous limits than STARTER", () => {
            expect(TIER_LIMITS.PRO.maxClients).toBeGreaterThan(TIER_LIMITS.STARTER.maxClients);
            expect(TIER_LIMITS.PRO.analytics).toBe(true);
            expect(TIER_LIMITS.PRO.paymentCollection).toBe(true);
        });

        it("STUDIO has the most generous limits", () => {
            expect(TIER_LIMITS.STUDIO.maxClients).toBeGreaterThan(TIER_LIMITS.PRO.maxClients);
            expect(TIER_LIMITS.STUDIO.whiteLabel).toBe(true);
        });

        it("client limits increase progressively", () => {
            expect(TIER_LIMITS.STARTER.maxClients).toBeLessThan(TIER_LIMITS.PRO.maxClients);
            expect(TIER_LIMITS.PRO.maxClients).toBeLessThan(TIER_LIMITS.STUDIO.maxClients);
        });
    });

    describe("TIER_PRICING", () => {
        it("has pricing for both currencies", () => {
            expect(Object.keys(TIER_PRICING)).toEqual(["usd", "gbp"]);
        });

        it("has pricing for all tiers in both currencies", () => {
            for (const currency of ["usd", "gbp"] as const) {
                for (const tier of ["STARTER", "PRO", "STUDIO"] as SubscriptionTier[]) {
                    const pricing = TIER_PRICING[currency][tier];
                    expect(pricing.monthly).toBeGreaterThan(0);
                    expect(pricing.annual).toBeGreaterThan(0);
                }
            }
        });

        it("annual price is less than monthly per tier", () => {
            for (const currency of ["usd", "gbp"] as const) {
                for (const tier of ["STARTER", "PRO", "STUDIO"] as SubscriptionTier[]) {
                    const p = TIER_PRICING[currency][tier];
                    expect(p.annual).toBeLessThan(p.monthly);
                }
            }
        });

        it("prices increase progressively per tier", () => {
            for (const currency of ["usd", "gbp"] as const) {
                expect(TIER_PRICING[currency].STARTER.monthly).toBeLessThan(TIER_PRICING[currency].PRO.monthly);
                expect(TIER_PRICING[currency].PRO.monthly).toBeLessThan(TIER_PRICING[currency].STUDIO.monthly);
            }
        });
    });

    describe("TIER_ORDER", () => {
        it("has correct ascending order", () => {
            expect(TIER_ORDER).toEqual(["STARTER", "PRO", "STUDIO"]);
        });
    });

    describe("TRIAL_DAYS", () => {
        it("is 7 days", () => {
            expect(TRIAL_DAYS).toBe(7);
        });
    });
});
