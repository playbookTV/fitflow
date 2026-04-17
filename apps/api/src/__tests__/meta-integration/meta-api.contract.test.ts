/**
 * Meta/WhatsApp Graph API contract tests.
 *
 * These tests validate FitFlow's integration against the LIVE Meta API.
 * They are opt-in: skipped unless META_TEST_ACCESS_TOKEN is set.
 *
 * To run:
 *   1. Go to https://developers.facebook.com/tools/explorer/2736422046719331/
 *   2. Select permissions: whatsapp_business_messaging, whatsapp_business_management
 *   3. Generate a User Access Token
 *   4. Run: META_TEST_ACCESS_TOKEN=<token> pnpm --filter @fitflow/api vitest run src/__tests__/meta-integration
 */
import { describe, it, expect } from "vitest";
import axios from "axios";
import { TemplateId } from "@fitflow/shared";
import { META_TEMPLATES, buildCreatePayload, buildSendPayload } from "../../lib/templates/meta-templates";

const META_TOKEN = process.env.META_TEST_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
const BUSINESS_ACCOUNT_ID = process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID;
const API_VERSION = "v22.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

const headers = META_TOKEN ? { Authorization: `Bearer ${META_TOKEN}` } : {};

describe.skipIf(!META_TOKEN)("Meta Graph API Contract Tests", () => {
    it("validates access token", async () => {
        const res = await axios.get(`${BASE_URL}/me`, { headers });
        expect(res.status).toBe(200);
        expect(res.data.id).toBeTruthy();
    });

    it("verifies phone number ID is accessible", async () => {
        if (!PHONE_NUMBER_ID) return;
        const res = await axios.get(`${BASE_URL}/${PHONE_NUMBER_ID}`, { headers });
        expect(res.status).toBe(200);
        expect(res.data.id).toBe(PHONE_NUMBER_ID);
    });

    it("lists registered message templates", async () => {
        if (!BUSINESS_ACCOUNT_ID) return;
        const res = await axios.get(
            `${BASE_URL}/${BUSINESS_ACCOUNT_ID}/message_templates?limit=100`,
            { headers }
        );
        expect(res.status).toBe(200);
        expect(Array.isArray(res.data.data)).toBe(true);

        const registeredNames = res.data.data.map((t: any) => t.name);
        const expectedNames = Object.values(META_TEMPLATES).map((t) => t.metaName);

        // Verify all FitFlow templates are registered on Meta
        const missing = expectedNames.filter((name) => !registeredNames.includes(name));
        if (missing.length > 0) {
            console.warn(`[Contract] Missing templates on Meta: ${missing.join(", ")}`);
        }
        // At least some templates should be registered
        const found = expectedNames.filter((name) => registeredNames.includes(name));
        expect(found.length).toBeGreaterThan(0);
    });

    it("buildCreatePayload produces valid structure for all templates", () => {
        const allIds = Object.values(TemplateId);
        for (const id of allIds) {
            const payload = buildCreatePayload(id);
            expect(payload.name).toMatch(/^[a-z0-9_]+$/);
            expect(payload.language).toBe("en");
            expect(["UTILITY", "MARKETING"]).toContain(payload.category);
            expect(payload.components).toHaveLength(1);
            expect(payload.components[0].type).toBe("BODY");
            expect(payload.components[0].text.length).toBeGreaterThan(0);
        }
    });

    it("buildSendPayload produces valid structure for all templates", () => {
        const testContext = {
            client_first_name: "Test",
            coach_first_name: "Coach",
            offer_name: "Test Programme",
            intake_link: "https://example.com/intake",
            payment_link: "https://example.com/pay",
            programme_start_date: "Monday",
            next_checkin_day: "Sunday",
            workout_day_number: 1,
            workout_name: "Test Workout",
            exercise_list: "1. Test exercise",
            clientId: "test-id",
            programme_week: 1,
            total_weeks: 12,
            weekly_summary: "All done",
            compliance: 100,
            checkin_link: "https://example.com/checkin",
            amount: "£50",
            renewal_date: "1st Jan",
            renewal_amount: "£50",
            bank_transfer_details: "Test details",
            broadcast_message: "Test broadcast",
            exercise_name: "Test Exercise",
            muscle_group: "Test Muscle",
            sets: 3,
            reps: "10",
            instructions: "Test instructions",
        };

        const allIds = Object.values(TemplateId);
        for (const id of allIds) {
            const payload = buildSendPayload(id, testContext);
            expect(payload.name).toMatch(/^[a-z0-9_]+$/);
            expect(payload.language).toEqual({ code: "en" });
            expect(payload.components[0].type).toBe("body");
            expect(payload.components[0].parameters.length).toBe(META_TEMPLATES[id].paramKeys.length);
        }
    });

    it("sends a test text message", async () => {
        if (!PHONE_NUMBER_ID) return;
        const testNumber = process.env.META_TEST_PHONE_NUMBER;
        if (!testNumber) {
            console.warn("[Contract] Skipping send test — META_TEST_PHONE_NUMBER not set");
            return;
        }

        const res = await axios.post(
            `${BASE_URL}/${PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to: testNumber,
                type: "text",
                text: { body: "FitFlow contract test — please ignore" },
            },
            { headers }
        );

        expect(res.status).toBe(200);
        expect(res.data.messages).toBeDefined();
        expect(res.data.messages[0].id).toBeTruthy();
    });

    it("lists WhatsApp Flows", async () => {
        if (!BUSINESS_ACCOUNT_ID) return;
        const res = await axios.get(
            `${BASE_URL}/${BUSINESS_ACCOUNT_ID}/flows`,
            { headers }
        );
        expect(res.status).toBe(200);
        expect(Array.isArray(res.data.data)).toBe(true);
    });
});
