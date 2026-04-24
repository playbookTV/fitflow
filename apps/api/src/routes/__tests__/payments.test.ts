import { describe, it, expect, vi, beforeEach } from "vitest";
import { request, authHeader } from "../../__tests__/helpers/app";
import { prismaMock } from "../../__tests__/mocks/prisma";
import { buildClient, buildCoach, buildPayment, buildSubscription } from "../../__tests__/factories";
import { createCheckoutSession } from "../../lib/stripe";

const mockCreateCheckout = vi.mocked(createCheckoutSession);

/** Helper: mock an active PRO subscription so requireTier passes */
function mockActiveSubscription() {
    prismaMock.subscription.findUnique.mockResolvedValueOnce(
        buildSubscription({ tier: "PRO", status: "ACTIVE" })
    );
}

describe("Payment Routes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── POST /payments/checkout ──────────────────────────────────────

    describe("POST /payments/checkout", () => {
        it("returns checkout URL for valid client", async () => {
            // Auth middleware may call coach.findUnique for cache validation
            prismaMock.coach.findUnique.mockResolvedValueOnce(buildCoach());
            mockActiveSubscription();
            prismaMock.client.findFirst.mockResolvedValueOnce(
                buildClient({ id: "client-1", coachId: "test-coach-id", monthlyRate: 5000 })
            );
            // Route handler calls coach.findUnique for Stripe account + pricing
            prismaMock.coach.findUnique.mockResolvedValueOnce(
                buildCoach({ stripeAccountId: "acct_test_coach", defaultMonthlyRate: 5000, billingCurrency: "gbp" })
            );
            mockCreateCheckout.mockResolvedValueOnce({
                id: "cs_test_smoke",
                url: "https://checkout.stripe.com/pay/cs_test_smoke",
                amount_total: 5000,
                currency: "gbp",
            } as any);
            prismaMock.payment.upsert.mockResolvedValueOnce(
                buildPayment({ stripeSessionId: "cs_test_smoke" })
            );

            const res = await request.post("/payments/checkout")
                .set(authHeader())
                .send({ clientId: "client-1" });

            expect(res.status).toBe(200);
            expect(res.body.url).toContain("checkout.stripe.com");
        });

        it("returns 404 when client does not belong to coach", async () => {
            prismaMock.coach.findUnique.mockResolvedValueOnce(buildCoach());
            mockActiveSubscription();
            prismaMock.client.findFirst.mockResolvedValueOnce(null);

            const res = await request.post("/payments/checkout")
                .set(authHeader())
                .send({ clientId: "someone-elses-client" });

            expect(res.status).toBe(404);
        });

        it("returns 403 without an active subscription", async () => {
            prismaMock.coach.findUnique.mockResolvedValueOnce(buildCoach());
            prismaMock.subscription.findUnique.mockResolvedValueOnce(null);

            const res = await request.post("/payments/checkout")
                .set(authHeader())
                .send({ clientId: "client-1" });

            expect(res.status).toBe(403);
        });
    });

    // ── POST /payments/confirm-bank-transfer ─────────────────────────

    describe("POST /payments/confirm-bank-transfer", () => {
        it("confirms bank transfer and transitions PENDING_PAYMENT → INTAKE_SENT", async () => {
            mockActiveSubscription();
            prismaMock.client.findFirst.mockResolvedValueOnce(
                buildClient({ id: "client-1", coachId: "test-coach-id", status: "PENDING_PAYMENT" })
            );
            prismaMock.payment.create.mockResolvedValueOnce(
                buildPayment({ id: "pay-bt-1", paymentMethod: "BANK_TRANSFER" })
            );
            prismaMock.client.update.mockResolvedValueOnce(
                buildClient({ id: "client-1", status: "INTAKE_SENT" })
            );
            prismaMock.eventLog.create.mockResolvedValueOnce({ id: "evt-1" } as any);

            const res = await request.post("/payments/confirm-bank-transfer")
                .set(authHeader())
                .send({ clientId: "client-1", amount: 5000, currency: "gbp" });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(prismaMock.client.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: "client-1" },
                    data: { status: "INTAKE_SENT" },
                })
            );
        });

        it("returns 400 when clientId or amount is missing", async () => {
            mockActiveSubscription();
            prismaMock.client.findFirst.mockResolvedValueOnce(
                buildClient({ id: "client-1", coachId: "test-coach-id" })
            );

            const res = await request.post("/payments/confirm-bank-transfer")
                .set(authHeader())
                .send({ clientId: "client-1" }); // missing amount

            expect(res.status).toBe(400);
        });

        it("skips status transition when client is not PENDING_PAYMENT", async () => {
            mockActiveSubscription();
            prismaMock.client.findFirst.mockResolvedValueOnce(
                buildClient({ id: "client-1", coachId: "test-coach-id", status: "ACTIVE" })
            );
            prismaMock.payment.create.mockResolvedValueOnce(
                buildPayment({ paymentMethod: "BANK_TRANSFER" })
            );
            prismaMock.eventLog.create.mockResolvedValueOnce({ id: "evt-1" });

            const res = await request.post("/payments/confirm-bank-transfer")
                .set(authHeader())
                .send({ clientId: "client-1", amount: 3000 });

            expect(res.status).toBe(200);
            expect(prismaMock.client.update).not.toHaveBeenCalled();
        });
    });

    // ── GET /payments/history ────────────────────────────────────────

    describe("GET /payments/history", () => {
        it("returns payment list for the coach", async () => {
            prismaMock.coach.findUnique.mockResolvedValueOnce(buildCoach());
            prismaMock.payment.findMany.mockResolvedValueOnce([
                {
                    ...buildPayment(),
                    client: { name: "Test Client" },
                },
            ]);

            const res = await request.get("/payments/history")
                .set(authHeader());

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0]).toMatchObject({
                clientName: "Test Client",
                amount: 5000,
                status: "succeeded",
            });
        });

        it("returns empty array when no payments exist", async () => {
            prismaMock.coach.findUnique.mockResolvedValueOnce(buildCoach());
            prismaMock.payment.findMany.mockResolvedValueOnce([]);

            const res = await request.get("/payments/history")
                .set(authHeader());

            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });
    });

    // ── POST /payments/:paymentId/remind ─────────────────────────────

    describe("POST /payments/:paymentId/remind", () => {
        it("returns 404 when payment does not exist", async () => {
            prismaMock.coach.findUnique.mockResolvedValueOnce(buildCoach());
            prismaMock.payment.findUnique.mockResolvedValueOnce(null);

            const res = await request.post("/payments/pay-999/remind")
                .set(authHeader());

            expect(res.status).toBe(404);
        });

        it("returns 400 when payment is not pending", async () => {
            prismaMock.coach.findUnique.mockResolvedValueOnce(buildCoach());
            prismaMock.payment.findUnique.mockResolvedValueOnce({
                ...buildPayment({ id: "pay-1", status: "SUCCEEDED" }),
                client: {
                    ...buildClient({ coachId: "test-coach-id" }),
                    coach: { name: "Test Coach", stripeAccountId: "acct_test", billingCurrency: "gbp" },
                },
            });

            const res = await request.post("/payments/pay-1/remind")
                .set(authHeader());

            expect(res.status).toBe(400);
            expect(res.body.error).toContain("pending");
        });
    });

    // ── GET /payments/:paymentId/receipt ──────────────────────────────

    describe("GET /payments/:paymentId/receipt", () => {
        it("returns 404 when payment does not exist", async () => {
            prismaMock.coach.findUnique.mockResolvedValueOnce(buildCoach());
            prismaMock.payment.findUnique.mockResolvedValueOnce(null);

            const res = await request.get("/payments/pay-999/receipt")
                .set(authHeader());

            expect(res.status).toBe(404);
        });

        it("returns HTML receipt for bank transfer payments", async () => {
            prismaMock.coach.findUnique.mockResolvedValueOnce(buildCoach());
            prismaMock.payment.findUnique.mockResolvedValueOnce({
                ...buildPayment({ id: "pay-bt", paymentMethod: "BANK_TRANSFER", stripeSessionId: null }),
                client: {
                    ...buildClient({ coachId: "test-coach-id" }),
                    coach: { name: "Test Coach", businessName: null },
                },
            });

            const res = await request.get("/payments/pay-bt/receipt")
                .set(authHeader());

            expect(res.status).toBe(200);
            expect(res.headers["content-type"]).toContain("text/html");
            expect(res.text).toContain("Payment Receipt");
        });
    });
});
