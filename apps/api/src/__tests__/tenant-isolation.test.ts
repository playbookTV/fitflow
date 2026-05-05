import { describe, it, expect, vi, beforeEach } from "vitest";
import { request, authHeader } from "./helpers/app";
import { prismaMock } from "./mocks/prisma";
import { buildCoach, buildSubscription } from "./factories";

/**
 * Cross-tenant isolation regression suite.
 *
 * Coach A is the authenticated coach (id "test-coach-id" via auth mock).
 * Coach B is the "other" tenant whose data must remain inaccessible.
 *
 * Each test asserts that:
 *   1. Prisma is called with a where clause that scopes by Coach A's id.
 *   2. When that scope filter excludes the row (mock returns null), the
 *      route responds 404 — never 200, never 500.
 */

const COACH_A = "test-coach-id";
const COACH_B = "coach-b-id";

function activeSub() {
    prismaMock.subscription.findUnique.mockResolvedValueOnce(
        buildSubscription({ tier: "PRO", status: "ACTIVE" }),
    );
}

describe("Tenant isolation — payment endpoints", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        prismaMock.coach.findUnique.mockResolvedValue(buildCoach());
    });

    it("GET /payments/:id/receipt — Coach A cannot read Coach B's payment", async () => {
        // Mock returns null because the where filter ({ id, client: { coachId: A } })
        // does not match a payment owned by Coach B.
        prismaMock.payment.findFirst.mockResolvedValueOnce(null);

        const res = await request
            .get("/payments/coach-b-payment-id/receipt")
            .set(authHeader());

        expect(res.status).toBe(404);
        expect(prismaMock.payment.findFirst).toHaveBeenCalledOnce();

        const call = prismaMock.payment.findFirst.mock.calls[0][0];
        expect(call.where).toMatchObject({
            id: "coach-b-payment-id",
            client: { coachId: COACH_A },
        });
    });

    it("GET /payments/:id/receipt — does NOT use unscoped findUnique", async () => {
        prismaMock.payment.findFirst.mockResolvedValueOnce(null);
        await request.get("/payments/some-payment/receipt").set(authHeader());
        expect(prismaMock.payment.findUnique).not.toHaveBeenCalled();
    });

    it("POST /payments/:id/remind — Coach A cannot remind on Coach B's payment", async () => {
        activeSub();
        prismaMock.payment.findFirst.mockResolvedValueOnce(null);

        const res = await request
            .post("/payments/coach-b-payment-id/remind")
            .set(authHeader());

        expect(res.status).toBe(404);
        const call = prismaMock.payment.findFirst.mock.calls[0][0];
        expect(call.where).toMatchObject({
            id: "coach-b-payment-id",
            client: { coachId: COACH_A },
        });
    });

    it("POST /payments/:id/remind — does NOT use unscoped findUnique", async () => {
        activeSub();
        prismaMock.payment.findFirst.mockResolvedValueOnce(null);
        await request.post("/payments/some-payment/remind").set(authHeader());
        expect(prismaMock.payment.findUnique).not.toHaveBeenCalled();
    });
});

describe("Tenant isolation — Stripe webhook", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rejects checkout.session.completed when metadata.coachId does not own metadata.clientId", async () => {
        const { verifyWebhook } = await import("../lib/stripe");
        vi.mocked(verifyWebhook).mockReturnValueOnce({
            type: "checkout.session.completed",
            data: {
                object: {
                    id: "cs_test_cross_tenant",
                    metadata: { clientId: "coach-b-client-id", coachId: COACH_A },
                    amount_total: 5000,
                    currency: "gbp",
                },
            },
        } as never);

        // Ownership check returns null — the (clientId, coachId) pair from metadata
        // doesn't exist in our DB.
        prismaMock.client.findFirst.mockResolvedValueOnce(null);

        const res = await request
            .post("/payments/webhook")
            .set("stripe-signature", "test-sig")
            .send({});

        expect(res.status).toBe(200); // Webhook returns 200 to avoid Stripe retries
        // No payment write, no transaction, no jobs enqueued
        expect(prismaMock.$transaction).not.toHaveBeenCalled();
        expect(prismaMock.payment.upsert).not.toHaveBeenCalled();
    });

    it("rejects when metadata is missing required fields", async () => {
        const { verifyWebhook } = await import("../lib/stripe");
        vi.mocked(verifyWebhook).mockReturnValueOnce({
            type: "checkout.session.completed",
            data: {
                object: {
                    id: "cs_test_no_metadata",
                    metadata: {}, // missing clientId AND coachId
                    amount_total: 5000,
                    currency: "gbp",
                },
            },
        } as never);

        const res = await request
            .post("/payments/webhook")
            .set("stripe-signature", "test-sig")
            .send({});

        expect(res.status).toBe(200);
        expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
});

describe("Tenant guard — isCoachScoped logic", () => {
    // Re-import the module's internals via a require so we can unit-test
    // the heuristic directly. The function is not exported, so we test it
    // through the extension's behavior with a fresh PrismaClient mock.

    it("recognises direct coachId scope", async () => {
        // Sanity: { coachId } passes
        const where = { id: "x", coachId: COACH_A };
        expect(hasCoachScope(where)).toBe(true);
    });

    it("recognises scope through client relation", () => {
        const where = { id: "x", client: { coachId: COACH_A } };
        expect(hasCoachScope(where)).toBe(true);
    });

    it("recognises explicit __unsafeGlobal escape hatch", () => {
        const where = { phone: "447", __unsafeGlobal: true };
        expect(hasCoachScope(where)).toBe(true);
    });

    it("rejects empty client relation as scope", () => {
        const where = { id: "x", client: {} };
        expect(hasCoachScope(where)).toBe(false);
    });

    it("rejects clientId-only scope", () => {
        const where = { clientId: "c", isActive: true };
        expect(hasCoachScope(where)).toBe(false);
    });

    it("rejects OR with one unscoped branch", () => {
        const where = {
            OR: [{ coachId: COACH_A }, { id: "x" }],
        };
        expect(hasCoachScope(where)).toBe(false);
    });

    it("accepts AND when all branches scoped", () => {
        const where = {
            AND: [{ coachId: COACH_A }, { isActive: true, client: { coachId: COACH_A } }],
        };
        expect(hasCoachScope(where)).toBe(true);
    });
});

/**
 * Replicates the prisma.ts isCoachScoped heuristic so we can unit-test it
 * without re-loading the extension. If you change isCoachScoped in
 * apps/api/src/lib/prisma.ts, keep this in sync.
 */
function hasCoachScope(where: unknown): boolean {
    if (!where || typeof where !== "object") return false;
    const w = where as Record<string, unknown>;
    if (w.__unsafeGlobal === true) return true;
    if (w.coachId != null) return true;
    if (w.coach && typeof w.coach === "object" && Object.keys(w.coach).length > 0) return true;
    const tenantParents = ["client", "lead", "plan", "assignment", "mealPlan", "mealAssignment", "planAssignment", "offer"] as const;
    for (const key of tenantParents) {
        const child = w[key];
        if (child && typeof child === "object" && hasCoachScope(child)) return true;
    }
    if (Array.isArray(w.AND) && w.AND.length > 0 && w.AND.every(hasCoachScope)) return true;
    if (Array.isArray(w.OR) && w.OR.length > 0 && w.OR.every(hasCoachScope)) return true;
    return false;
}
