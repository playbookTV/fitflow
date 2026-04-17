import { describe, it, expect, vi } from "vitest";
import crypto from "node:crypto";
import { request } from "../../__tests__/helpers/app";
import { prismaMock } from "../../__tests__/mocks/prisma";
import { mockMessageQueue } from "../../__tests__/mocks/queue";
import { buildClient } from "../../__tests__/factories";
import textMessageFixture from "../../__tests__/fixtures/meta-webhooks/text-message.json";
import statusUpdateFixture from "../../__tests__/fixtures/meta-webhooks/status-update.json";
import flowCheckinFixture from "../../__tests__/fixtures/meta-webhooks/flow-response-checkin.json";
import flowWorkoutFixture from "../../__tests__/fixtures/meta-webhooks/flow-response-workout.json";

/**
 * Helper to send a signed webhook POST.
 * Uses the same HMAC approach as the real Meta webhook.
 */
function sendSignedWebhook(payload: object) {
    const body = JSON.stringify(payload);
    const hmac = crypto.createHmac("sha256", "test-app-secret");
    hmac.update(body);
    const signature = `sha256=${hmac.digest("hex")}`;

    return request.post("/webhooks")
        .set("Content-Type", "application/json")
        .set("X-Hub-Signature-256", signature)
        .send(body);
}

describe("WhatsApp Webhooks", () => {
    describe("GET /webhooks (verification)", () => {
        it("returns challenge when verify_token matches", async () => {
            const res = await request.get("/webhooks")
                .query({
                    "hub.mode": "subscribe",
                    "hub.verify_token": "test-verify-token",
                    "hub.challenge": "test-challenge-123",
                });

            expect(res.status).toBe(200);
            expect(res.text).toBe("test-challenge-123");
        });

        it("returns 403 when verify_token does not match", async () => {
            const res = await request.get("/webhooks")
                .query({
                    "hub.mode": "subscribe",
                    "hub.verify_token": "wrong-token",
                    "hub.challenge": "test-challenge-123",
                });

            expect(res.status).toBe(403);
        });

        it("returns 400 when mode or token is missing", async () => {
            const res = await request.get("/webhooks");
            expect(res.status).toBe(400);
        });
    });

    describe("POST /webhooks (message processing)", () => {
        it("returns 403 when signature is missing", async () => {
            const res = await request.post("/webhooks")
                .send(textMessageFixture);

            expect(res.status).toBe(403);
        });

        it("returns 403 when signature is invalid", async () => {
            const res = await request.post("/webhooks")
                .set("X-Hub-Signature-256", "sha256=invalid")
                .send(textMessageFixture);

            expect(res.status).toBe(403);
        });

        it("returns 200 and processes text message from known client", async () => {
            prismaMock.client.findFirst.mockResolvedValueOnce(
                buildClient({ id: "client-1", coachId: "coach-1" })
            );
            prismaMock.message.create.mockResolvedValueOnce({ id: "msg-1" });

            const res = await sendSignedWebhook(textMessageFixture);

            expect(res.status).toBe(200);

            // Wait for async processing
            await vi.waitFor(() => {
                expect(prismaMock.message.create).toHaveBeenCalled();
            });

            expect(mockMessageQueue.add).toHaveBeenCalledWith(
                "process-message",
                expect.objectContaining({
                    clientId: "client-1",
                    coachId: "coach-1",
                    body: "Hello coach!",
                })
            );
        });

        it("handles unknown sender gracefully", async () => {
            prismaMock.client.findFirst.mockResolvedValueOnce(null);

            const res = await sendSignedWebhook(textMessageFixture);

            expect(res.status).toBe(200);
            // Should not create a message or enqueue
            await new Promise(r => setTimeout(r, 50));
            expect(prismaMock.message.create).not.toHaveBeenCalled();
        });

        it("processes check-in flow response", async () => {
            prismaMock.client.findFirst.mockResolvedValueOnce(
                buildClient({ id: "test-client-id" })
            );
            prismaMock.message.create.mockResolvedValueOnce({ id: "msg-flow-1" });
            prismaMock.checkIn.create.mockResolvedValueOnce({ id: "checkin-1", weight: 80.5, energy: 4, sleep: "7-8 hours" });

            const res = await sendSignedWebhook(flowCheckinFixture);

            expect(res.status).toBe(200);

            await vi.waitFor(() => {
                expect(prismaMock.checkIn.create).toHaveBeenCalled();
            });

            expect(prismaMock.checkIn.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    clientId: "test-client-id",
                    weight: 80.5,
                    energy: 4,
                    sleep: "7-8 hours",
                }),
            });
        });

        it("processes workout log flow response", async () => {
            const mockAssignment = {
                id: "assignment-1",
                startDate: new Date(Date.now() - 5 * 86400000), // 5 days ago
                isActive: true,
            };

            prismaMock.client.findFirst.mockResolvedValueOnce(
                buildClient({ id: "test-client-id" })
            );
            prismaMock.message.create.mockResolvedValueOnce({ id: "msg-flow-2" });
            prismaMock.planAssignment.findFirst.mockResolvedValueOnce(mockAssignment);
            prismaMock.workoutLog.create.mockResolvedValue({ id: "log-1", status: "COMPLETED" });
            prismaMock.workoutLog.count.mockResolvedValue(3);
            prismaMock.planAssignment.update.mockResolvedValue({ ...mockAssignment, compliance: 60 });

            const res = await sendSignedWebhook(flowWorkoutFixture);

            expect(res.status).toBe(200);

            await vi.waitFor(() => {
                expect(prismaMock.workoutLog.create).toHaveBeenCalled();
            });
        });

        it("handles status update webhook (no messages to process)", async () => {
            const res = await sendSignedWebhook(statusUpdateFixture);

            expect(res.status).toBe(200);
            // No message processing should happen for status updates
            expect(prismaMock.message.create).not.toHaveBeenCalled();
        });
    });
});
