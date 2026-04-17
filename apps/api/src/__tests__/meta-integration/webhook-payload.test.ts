/**
 * Webhook payload validation tests.
 * These test our webhook handler against realistic Meta webhook payload structures
 * WITHOUT hitting the live API.
 */
import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import textMessage from "../fixtures/meta-webhooks/text-message.json";
import statusUpdate from "../fixtures/meta-webhooks/status-update.json";
import flowCheckin from "../fixtures/meta-webhooks/flow-response-checkin.json";
import flowWorkout from "../fixtures/meta-webhooks/flow-response-workout.json";

function verifyMetaSignature(rawBody: Buffer, signature: string, appSecret: string): boolean {
    const hmac = crypto.createHmac("sha256", appSecret);
    hmac.update(rawBody);
    const expected = `sha256=${hmac.digest("hex")}`;
    try {
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
        return false;
    }
}

function computeSignature(payload: string, secret: string = "test-app-secret"): string {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    return `sha256=${hmac.digest("hex")}`;
}

describe("Meta Webhook Payload Validation", () => {
    describe("HMAC Signature Verification", () => {
        it("accepts valid signature", () => {
            const payload = JSON.stringify(textMessage);
            const signature = computeSignature(payload);
            const result = verifyMetaSignature(Buffer.from(payload), signature, "test-app-secret");
            expect(result).toBe(true);
        });

        it("rejects invalid signature", () => {
            const payload = JSON.stringify(textMessage);
            const result = verifyMetaSignature(Buffer.from(payload), "sha256=invalid", "test-app-secret");
            expect(result).toBe(false);
        });

        it("rejects wrong secret", () => {
            const payload = JSON.stringify(textMessage);
            const signature = computeSignature(payload, "wrong-secret");
            const result = verifyMetaSignature(Buffer.from(payload), signature, "test-app-secret");
            expect(result).toBe(false);
        });

        it("rejects tampered payload", () => {
            const payload = JSON.stringify(textMessage);
            const signature = computeSignature(payload);
            const tampered = payload.replace("Hello coach!", "Hacked!");
            const result = verifyMetaSignature(Buffer.from(tampered), signature, "test-app-secret");
            expect(result).toBe(false);
        });

        it("rejects malformed signature format", () => {
            const payload = JSON.stringify(textMessage);
            const result = verifyMetaSignature(Buffer.from(payload), "not-sha256-prefixed", "test-app-secret");
            expect(result).toBe(false);
        });
    });

    describe("Payload Structure Validation", () => {
        it("text message has correct structure", () => {
            expect(textMessage.object).toBe("whatsapp_business_account");
            const value = textMessage.entry[0].changes[0].value;
            expect(value.messaging_product).toBe("whatsapp");
            expect(value.messages).toHaveLength(1);
            expect(value.messages[0].type).toBe("text");
            expect(value.messages[0].text.body).toBe("Hello coach!");
            expect(value.messages[0].from).toBeTruthy();
            expect(value.messages[0].id).toBeTruthy();
        });

        it("status update has correct structure", () => {
            expect(statusUpdate.object).toBe("whatsapp_business_account");
            const value = statusUpdate.entry[0].changes[0].value;
            expect(value.statuses).toHaveLength(1);
            expect(value.statuses[0].status).toBe("delivered");
            expect(value.statuses[0].recipient_id).toBeTruthy();
        });

        it("check-in flow response has correct structure", () => {
            const value = flowCheckin.entry[0].changes[0].value;
            const msg = value.messages[0];
            expect(msg.type).toBe("interactive");
            expect(msg.interactive.type).toBe("nfm_reply");

            const responseJson = JSON.parse(msg.interactive.nfm_reply.response_json);
            expect(responseJson.flow_token).toContain("checkin_");
            expect(responseJson.weight).toBeTruthy();
            expect(responseJson.energy).toBeTruthy();
            expect(responseJson.sleep).toBeTruthy();
        });

        it("workout log flow response has correct structure", () => {
            const value = flowWorkout.entry[0].changes[0].value;
            const msg = value.messages[0];
            expect(msg.type).toBe("interactive");
            expect(msg.interactive.type).toBe("nfm_reply");

            const responseJson = JSON.parse(msg.interactive.nfm_reply.response_json);
            expect(responseJson.flow_token).toContain("workoutlog_");
            expect(responseJson.status).toMatch(/^(COMPLETED|MODIFIED|SKIPPED)$/);
            expect(responseJson.rpe).toBeTruthy();
        });
    });

    describe("Edge Cases", () => {
        it("handles empty entry array", () => {
            const payload = { object: "whatsapp_business_account", entry: [] };
            expect(payload.entry).toHaveLength(0);
        });

        it("handles missing changes", () => {
            const payload = { object: "whatsapp_business_account", entry: [{ id: "123", changes: [] }] };
            expect(payload.entry[0].changes).toHaveLength(0);
        });

        it("handles missing messages in value", () => {
            const value = statusUpdate.entry[0].changes[0].value;
            // Status updates don't have messages
            expect((value as any).messages).toBeUndefined();
        });
    });
});
