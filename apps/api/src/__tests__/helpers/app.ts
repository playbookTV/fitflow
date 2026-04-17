import supertest from "supertest";
import app from "../../index";

/**
 * Supertest agent bound to the Express app.
 * Use this in route tests instead of importing app directly.
 */
export const request = supertest(app);

/**
 * Helper to set auth header for authenticated requests.
 */
export function authHeader() {
    return { Authorization: "Bearer test-token-123" };
}

/**
 * Helper to create a valid Meta webhook signature for testing.
 */
export function createMetaSignature(payload: string, appSecret: string = "test-app-secret"): string {
    const crypto = require("crypto");
    const hmac = crypto.createHmac("sha256", appSecret);
    hmac.update(payload);
    return `sha256=${hmac.digest("hex")}`;
}
