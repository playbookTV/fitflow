import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { prisma } from "../lib/prisma";
import { TIER_LIMITS, type SubscriptionTier } from "@fitflow/shared";

type LimitableResource = "clients" | "workoutPlans" | "mealPlans" | "offers";

function getActiveTier(subscription: { tier: string; status: string } | null): SubscriptionTier | null {
    if (!subscription) return null;
    if (subscription.status === "ACTIVE" || subscription.status === "TRIALING") {
        return subscription.tier as SubscriptionTier;
    }
    return null;
}

/**
 * Require an active subscription on any of the specified tiers.
 * Returns 403 if the coach's tier doesn't match.
 */
export const requireTier = (...allowedTiers: SubscriptionTier[]) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        const coachId = req.user?.id;
        if (!coachId) return res.status(401).json({ error: "Unauthorized" });

        try {
            const subscription = await prisma.subscription.findUnique({ where: { coachId } });
            const tier = getActiveTier(subscription);

            if (!tier) {
                return res.status(403).json({
                    error: "Subscription required",
                    code: "NO_SUBSCRIPTION",
                });
            }

            if (!allowedTiers.includes(tier)) {
                return res.status(403).json({
                    error: "Upgrade required",
                    code: "TIER_REQUIRED",
                    currentTier: tier,
                    requiredTiers: allowedTiers,
                });
            }

            next();
        } catch (err) {
            console.error("[Subscription Middleware] requireTier error:", err);
            res.status(500).json({ error: "Internal server error" });
        }
    };
};

/**
 * Enforce a usage limit for a resource based on the coach's subscription tier.
 * Returns 403 with limit details if the limit is reached.
 */
export const enforceLimit = (resource: LimitableResource) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        const coachId = req.user?.id;
        if (!coachId) return res.status(401).json({ error: "Unauthorized" });

        try {
            const subscription = await prisma.subscription.findUnique({ where: { coachId } });
            const tier = getActiveTier(subscription);

            if (!tier) {
                return res.status(403).json({
                    error: "Subscription required",
                    code: "NO_SUBSCRIPTION",
                });
            }

            const limits = TIER_LIMITS[tier];
            const limitKey = resource === "clients" ? "maxClients" : "maxClients"; // mapped below
            const limit = getLimit(limits, resource);

            if (limit === -1) return next(); // unlimited

            const count = await getResourceCount(coachId, resource);

            if (count >= limit) {
                return res.status(403).json({
                    error: "Limit reached",
                    code: "LIMIT_REACHED",
                    resource,
                    limit,
                    current: count,
                    tier,
                });
            }

            next();
        } catch (err) {
            console.error("[Subscription Middleware] enforceLimit error:", err);
            res.status(500).json({ error: "Internal server error" });
        }
    };
};

function getLimit(limits: typeof TIER_LIMITS[SubscriptionTier], resource: LimitableResource): number {
    switch (resource) {
        case "clients": return limits.maxClients;
        case "workoutPlans": return -1; // no plan limit currently in tier config
        case "mealPlans": return -1;    // no meal plan limit currently
        case "offers": return -1;       // no offer limit currently
        default: return -1;
    }
}

async function getResourceCount(coachId: string, resource: LimitableResource): Promise<number> {
    switch (resource) {
        case "clients":
            return prisma.client.count({ where: { coachId } });
        case "workoutPlans":
            return prisma.workoutPlan.count({ where: { coachId } });
        case "mealPlans":
            return prisma.mealPlan.count({ where: { coachId } });
        case "offers":
            return prisma.offer.count({ where: { coachId } });
        default:
            return 0;
    }
}
