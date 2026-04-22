import { describe, it, expect, vi, beforeEach } from "vitest";
import { authenticate, AuthRequest, _resetCoachCache } from "../auth";
import { prismaMock } from "../../__tests__/mocks/prisma";
import { mockGetUser } from "../../__tests__/mocks/auth";
import { buildCoach } from "../../__tests__/factories";
import type { Response, NextFunction } from "express";

function createMockReqRes(overrides: Partial<AuthRequest> = {}) {
    const req = {
        headers: { authorization: "Bearer valid-token-123" },
        user: undefined,
        ...overrides,
    } as AuthRequest;

    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    return { req, res, next };
}

describe("authenticate middleware", () => {
    beforeEach(() => {
        _resetCoachCache();
    });

    it("returns 401 when Authorization header is missing", async () => {
        const { req, res, next } = createMockReqRes({ headers: {} as any });
        await authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Missing or invalid token" });
        expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 when Authorization header does not start with Bearer", async () => {
        const { req, res, next } = createMockReqRes({
            headers: { authorization: "Basic abc123" } as any,
        });
        await authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 when Supabase returns an error", async () => {
        mockGetUser.mockResolvedValueOnce({
            data: { user: null },
            error: { message: "Invalid token" },
        });

        const { req, res, next } = createMockReqRes();
        await authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Invalid token" });
        expect(next).not.toHaveBeenCalled();
    });

    it("sets req.user and calls next for valid token with existing coach", async () => {
        prismaMock.coach.findUnique.mockResolvedValueOnce(buildCoach());

        const { req, res, next } = createMockReqRes();
        await authenticate(req, res, next);

        expect(req.user).toEqual({
            id: "test-coach-id",
            email: "coach@test.com",
        });
        expect(next).toHaveBeenCalled();
    });

    it("creates a new coach record when one does not exist", async () => {
        prismaMock.coach.findUnique.mockResolvedValueOnce(null);
        prismaMock.coach.create.mockResolvedValueOnce(buildCoach());

        const { req, res, next } = createMockReqRes();
        await authenticate(req, res, next);

        expect(prismaMock.coach.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    id: "test-coach-id",
                    email: "coach@test.com",
                }),
            })
        );
        expect(next).toHaveBeenCalled();
    });

    it("always defaults to USD billing currency regardless of Accept-Language", async () => {
        prismaMock.coach.findUnique.mockResolvedValueOnce(null);
        prismaMock.coach.create.mockResolvedValueOnce(buildCoach({ billingCurrency: "usd" }));

        const { req, res, next } = createMockReqRes({
            headers: {
                authorization: "Bearer valid-token-123",
                "accept-language": "en-GB,en;q=0.9",
            } as any,
        });
        await authenticate(req, res, next);

        expect(prismaMock.coach.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    billingCurrency: "usd",
                }),
            })
        );
    });

    it("defaults to USD billing currency", async () => {
        prismaMock.coach.findUnique.mockResolvedValueOnce(null);
        prismaMock.coach.create.mockResolvedValueOnce(buildCoach());

        const { req, res, next } = createMockReqRes({
            headers: {
                authorization: "Bearer valid-token-123",
                "accept-language": "en-US,en;q=0.9",
            } as any,
        });
        await authenticate(req, res, next);

        expect(prismaMock.coach.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    billingCurrency: "usd",
                }),
            })
        );
    });

    it("swallows P2002 unique constraint race condition", async () => {
        prismaMock.coach.findUnique.mockResolvedValueOnce(null);
        prismaMock.coach.create.mockRejectedValueOnce({ code: "P2002" });

        const { req, res, next } = createMockReqRes();
        await authenticate(req, res, next);

        // Should still call next despite the P2002 error
        expect(next).toHaveBeenCalled();
    });
});
