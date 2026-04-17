import { describe, it, expect, vi } from "vitest";
import { request } from "../../__tests__/helpers/app";
import { prismaMock } from "../../__tests__/mocks/prisma";
import { buildCoach, buildSubscription } from "../../__tests__/factories";
import { verifySubscriptionWebhook } from "../../lib/stripe";

const mockVerifySubWebhook = vi.mocked(verifySubscriptionWebhook);

// Mock subscription-tiers module
vi.mock("../../lib/subscription-tiers", () => ({
    tierFromPriceId: vi.fn().mockReturnValue({ tier: "PRO", interval: "MONTHLY" }),
    getStripePriceId: vi.fn(),
}));

describe("Subscription Webhook (POST /subscriptions/webhook)", () => {
    it("returns 400 when signature verification fails", async () => {
        mockVerifySubWebhook.mockImplementationOnce(() => {
            throw new Error("Signature verification failed");
        });

        const res = await request.post("/subscriptions/webhook")
            .set("Content-Type", "application/json")
            .set("stripe-signature", "invalid_sig")
            .send(Buffer.from("{}"));

        expect(res.status).toBe(400);
    });

    it("creates subscription on customer.subscription.created", async () => {
        mockVerifySubWebhook.mockReturnValueOnce({
            id: "evt_sub_001",
            type: "customer.subscription.created",
            data: {
                object: {
                    id: "sub_test_001",
                    customer: "cus_test_001",
                    status: "trialing",
                    items: { data: [{ price: { id: "price_pro_monthly" } }] },
                    current_period_start: Math.floor(Date.now() / 1000),
                    current_period_end: Math.floor(Date.now() / 1000) + 2592000,
                    trial_end: Math.floor(Date.now() / 1000) + 604800,
                    cancel_at_period_end: false,
                },
            },
        } as any);

        prismaMock.coach.findUnique.mockResolvedValueOnce(
            buildCoach({ stripeCustomerId: "cus_test_001" })
        );
        prismaMock.subscription.findUnique.mockResolvedValueOnce(null);
        prismaMock.subscription.upsert.mockResolvedValueOnce(
            buildSubscription({ tier: "PRO", status: "TRIALING" })
        );
        prismaMock.eventLog.create.mockResolvedValueOnce({ id: "evt-1" });

        const res = await request.post("/subscriptions/webhook")
            .set("Content-Type", "application/json")
            .set("stripe-signature", "valid_sig")
            .send(Buffer.from("{}"));

        expect(res.status).toBe(200);
        expect(prismaMock.subscription.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { coachId: "test-coach-id" },
                update: expect.objectContaining({ tier: "PRO", status: "TRIALING" }),
                create: expect.objectContaining({ tier: "PRO", status: "TRIALING" }),
            })
        );
    });

    it("cancels subscription on customer.subscription.deleted", async () => {
        mockVerifySubWebhook.mockReturnValueOnce({
            id: "evt_sub_del",
            type: "customer.subscription.deleted",
            data: {
                object: { customer: "cus_test_001" },
            },
        } as any);

        prismaMock.coach.findUnique.mockResolvedValueOnce(
            buildCoach({ stripeCustomerId: "cus_test_001" })
        );
        prismaMock.subscription.updateMany.mockResolvedValueOnce({ count: 1 });
        prismaMock.eventLog.create.mockResolvedValueOnce({ id: "evt-1" });

        const res = await request.post("/subscriptions/webhook")
            .set("Content-Type", "application/json")
            .set("stripe-signature", "valid_sig")
            .send(Buffer.from("{}"));

        expect(res.status).toBe(200);
        expect(prismaMock.subscription.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { coachId: "test-coach-id" },
                data: { status: "CANCELED" },
            })
        );
    });

    it("marks subscription as PAST_DUE on invoice.payment_failed", async () => {
        mockVerifySubWebhook.mockReturnValueOnce({
            id: "evt_inv_fail",
            type: "invoice.payment_failed",
            data: {
                object: {
                    customer: "cus_test_001",
                    subscription: "sub_test_001",
                    id: "inv_test_001",
                },
            },
        } as any);

        prismaMock.coach.findUnique.mockResolvedValueOnce(
            buildCoach({ stripeCustomerId: "cus_test_001" })
        );
        prismaMock.subscription.updateMany.mockResolvedValueOnce({ count: 1 });
        prismaMock.eventLog.create.mockResolvedValueOnce({ id: "evt-1" });

        const res = await request.post("/subscriptions/webhook")
            .set("Content-Type", "application/json")
            .set("stripe-signature", "valid_sig")
            .send(Buffer.from("{}"));

        expect(res.status).toBe(200);
        expect(prismaMock.subscription.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: { status: "PAST_DUE" },
            })
        );
    });
});
