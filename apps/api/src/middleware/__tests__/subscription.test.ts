import { describe, it, expect, vi } from "vitest";
import { requireTier, enforceLimit } from "../subscription";
import { prismaMock } from "../../__tests__/mocks/prisma";
import { buildSubscription } from "../../__tests__/factories";
import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../auth";

function createMockReqRes(userId = "test-coach-id") {
    const req = {
        user: userId ? { id: userId, email: "coach@test.com" } : undefined,
    } as AuthRequest;

    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    return { req, res, next };
}

describe("requireTier middleware", () => {
    it("returns 401 when user is not authenticated", async () => {
        const { req, res, next } = createMockReqRes("");
        req.user = undefined;
        await requireTier("PRO", "STUDIO")(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it("returns 403 NO_SUBSCRIPTION when no subscription exists", async () => {
        prismaMock.subscription.findUnique.mockResolvedValueOnce(null);
        const { req, res, next } = createMockReqRes();
        await requireTier("PRO")(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ code: "NO_SUBSCRIPTION" })
        );
        expect(next).not.toHaveBeenCalled();
    });

    it("returns 403 TIER_REQUIRED when tier does not match", async () => {
        prismaMock.subscription.findUnique.mockResolvedValueOnce(
            buildSubscription({ tier: "STARTER", status: "ACTIVE" })
        );
        const { req, res, next } = createMockReqRes();
        await requireTier("PRO", "STUDIO")(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                code: "TIER_REQUIRED",
                currentTier: "STARTER",
                requiredTiers: ["PRO", "STUDIO"],
            })
        );
    });

    it("passes when tier matches", async () => {
        prismaMock.subscription.findUnique.mockResolvedValueOnce(
            buildSubscription({ tier: "PRO", status: "ACTIVE" })
        );
        const { req, res, next } = createMockReqRes();
        await requireTier("PRO", "STUDIO")(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it("passes for TRIALING status", async () => {
        prismaMock.subscription.findUnique.mockResolvedValueOnce(
            buildSubscription({ tier: "PRO", status: "TRIALING" })
        );
        const { req, res, next } = createMockReqRes();
        await requireTier("PRO")(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it("returns NO_SUBSCRIPTION for CANCELED status", async () => {
        prismaMock.subscription.findUnique.mockResolvedValueOnce(
            buildSubscription({ tier: "PRO", status: "CANCELED" })
        );
        const { req, res, next } = createMockReqRes();
        await requireTier("PRO")(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ code: "NO_SUBSCRIPTION" })
        );
    });
});

describe("enforceLimit middleware", () => {
    it("returns 401 when user is not authenticated", async () => {
        const { req, res, next } = createMockReqRes("");
        req.user = undefined;
        await enforceLimit("clients")(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 403 NO_SUBSCRIPTION when no subscription exists", async () => {
        prismaMock.subscription.findUnique.mockResolvedValueOnce(null);
        const { req, res, next } = createMockReqRes();
        await enforceLimit("clients")(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ code: "NO_SUBSCRIPTION" })
        );
    });

    it("passes when count is below limit", async () => {
        prismaMock.subscription.findUnique.mockResolvedValueOnce(
            buildSubscription({ tier: "STARTER", status: "ACTIVE" })
        );
        prismaMock.client.count.mockResolvedValueOnce(5); // STARTER limit is 10

        const { req, res, next } = createMockReqRes();
        await enforceLimit("clients")(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it("returns 403 LIMIT_REACHED when at capacity", async () => {
        prismaMock.subscription.findUnique.mockResolvedValueOnce(
            buildSubscription({ tier: "STARTER", status: "ACTIVE" })
        );
        prismaMock.client.count.mockResolvedValueOnce(10); // STARTER limit is 10

        const { req, res, next } = createMockReqRes();
        await enforceLimit("clients")(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                code: "LIMIT_REACHED",
                resource: "clients",
                limit: 10,
                current: 10,
            })
        );
    });

    it("passes for unlimited resources (workoutPlans)", async () => {
        prismaMock.subscription.findUnique.mockResolvedValueOnce(
            buildSubscription({ tier: "STARTER", status: "ACTIVE" })
        );

        const { req, res, next } = createMockReqRes();
        await enforceLimit("workoutPlans")(req, res, next);

        // workoutPlans has -1 limit (unlimited), should pass without counting
        expect(next).toHaveBeenCalled();
    });
});
