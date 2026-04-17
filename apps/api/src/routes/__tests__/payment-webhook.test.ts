import { describe, it, expect, vi } from "vitest";
import { request } from "../../__tests__/helpers/app";
import { prismaMock } from "../../__tests__/mocks/prisma";
import { mockOnboardingQueue } from "../../__tests__/mocks/queue";
import { buildClient, buildPayment } from "../../__tests__/factories";
import { verifyWebhook } from "../../lib/stripe";

const mockVerifyWebhook = vi.mocked(verifyWebhook);

describe("Payment Webhook (POST /payments/webhook)", () => {
    it("returns 400 when signature verification fails", async () => {
        mockVerifyWebhook.mockImplementationOnce(() => {
            throw new Error("Signature verification failed");
        });

        const res = await request.post("/payments/webhook")
            .set("Content-Type", "application/json")
            .set("stripe-signature", "invalid_sig")
            .send(Buffer.from("{}"));

        expect(res.status).toBe(400);
        expect(res.text).toContain("Webhook Error");
    });

    it("processes checkout.session.completed and transitions client to INTAKE_SENT", async () => {
        const sessionId = "cs_test_payment_001";
        mockVerifyWebhook.mockReturnValueOnce({
            id: "evt_test_001",
            type: "checkout.session.completed",
            data: {
                object: {
                    id: sessionId,
                    metadata: { clientId: "client-1", coachId: "coach-1" },
                    amount_total: 5000,
                    currency: "gbp",
                },
            },
        } as any);

        // First call: check for existing payment (null = new)
        prismaMock.payment.findUnique.mockResolvedValueOnce(null);
        prismaMock.payment.upsert.mockResolvedValueOnce(buildPayment({ stripeSessionId: sessionId }));
        prismaMock.client.update.mockResolvedValueOnce(
            buildClient({ id: "client-1", status: "INTAKE_SENT", coachId: "coach-1" })
        );
        prismaMock.eventLog.create.mockResolvedValueOnce({ id: "evt-1" });

        const res = await request.post("/payments/webhook")
            .set("Content-Type", "application/json")
            .set("stripe-signature", "valid_sig")
            .send(Buffer.from("{}"));

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ received: true });

        expect(prismaMock.client.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "client-1", status: "PENDING_PAYMENT" },
                data: expect.objectContaining({ status: "INTAKE_SENT" }),
            })
        );

        expect(mockOnboardingQueue.add).toHaveBeenCalledTimes(2);
    });

    it("skips duplicate payment events", async () => {
        const sessionId = "cs_test_duplicate";
        mockVerifyWebhook.mockReturnValueOnce({
            id: "evt_test_002",
            type: "checkout.session.completed",
            data: {
                object: {
                    id: sessionId,
                    metadata: { clientId: "client-1" },
                    amount_total: 5000,
                    currency: "gbp",
                },
            },
        } as any);

        // Existing payment found = duplicate
        prismaMock.payment.findUnique.mockResolvedValueOnce(buildPayment({ stripeSessionId: sessionId }));
        prismaMock.payment.upsert.mockResolvedValueOnce(buildPayment({ stripeSessionId: sessionId }));

        const res = await request.post("/payments/webhook")
            .set("Content-Type", "application/json")
            .set("stripe-signature", "valid_sig")
            .send(Buffer.from("{}"));

        expect(res.status).toBe(200);
        // Should NOT enqueue onboarding for duplicate
        expect(mockOnboardingQueue.add).not.toHaveBeenCalled();
    });
});
