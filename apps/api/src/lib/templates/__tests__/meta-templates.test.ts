import { describe, it, expect } from "vitest";
import { TemplateId } from "@fitflow/shared";
import { META_TEMPLATES, buildCreatePayload, buildSendPayload } from "../meta-templates";

describe("Meta Template Definitions", () => {
    const allTemplateIds = Object.values(TemplateId);

    it("should have a definition for every TemplateId", () => {
        for (const id of allTemplateIds) {
            expect(META_TEMPLATES[id]).toBeDefined();
            expect(META_TEMPLATES[id].metaName).toBeTruthy();
        }
    });

    it("all metaNames should be lowercase with underscores", () => {
        for (const id of allTemplateIds) {
            const { metaName } = META_TEMPLATES[id];
            expect(metaName).toMatch(/^[a-z0-9_]+$/);
        }
    });

    it("all categories should be UTILITY or MARKETING", () => {
        for (const id of allTemplateIds) {
            expect(["UTILITY", "MARKETING"]).toContain(META_TEMPLATES[id].category);
        }
    });

    it("parameter count in bodyText should match paramKeys length", () => {
        for (const id of allTemplateIds) {
            const def = META_TEMPLATES[id];
            // Count unique {{N}} placeholders in bodyText
            const matches = def.bodyText.match(/\{\{\d+\}\}/g) || [];
            const uniquePlaceholders = new Set(matches);
            expect(uniquePlaceholders.size).toBe(def.paramKeys.length);
        }
    });

    it("all languages should be 'en'", () => {
        for (const id of allTemplateIds) {
            expect(META_TEMPLATES[id].language).toBe("en");
        }
    });
});

describe("buildCreatePayload", () => {
    it.each(Object.values(TemplateId))("builds valid create payload for %s", (id) => {
        const payload = buildCreatePayload(id);
        expect(payload.name).toBeTruthy();
        expect(payload.language).toBe("en");
        expect(["UTILITY", "MARKETING"]).toContain(payload.category);
        expect(payload.components).toHaveLength(1);
        expect(payload.components[0].type).toBe("BODY");
        expect(payload.components[0].text).toBeTruthy();
    });
});

describe("buildSendPayload", () => {
    const baseContext = {
        client_first_name: "Alex",
        coach_first_name: "Sam",
        offer_name: "12-Week Transform",
        intake_link: "https://fitflow.app/intake/abc123",
        payment_link: "https://pay.stripe.com/test",
        programme_start_date: "Monday 3rd February",
        next_checkin_day: "Sunday",
        workout_day_number: 3,
        workout_name: "Upper Body Push",
        exercise_list: "1. Bench Press 4x8",
        programme_week: 2,
        total_weeks: 12,
        weekly_summary: "3/3 done",
        compliance: 85,
        checkin_link: "https://fitflow.app/checkin",
        amount: "£50.00",
        renewal_date: "15th March 2025",
        renewal_amount: "£50.00",
        bank_transfer_details: "Sort: 12-34-56, Acc: 12345678",
        broadcast_message: "Group session Saturday 10am.",
        exercise_name: "Romanian Deadlift",
        muscle_group: "Hamstrings & Glutes",
        sets: 4,
        reps: "10-12",
        instructions: "Hinge at the hips.",
        day_number: 3,
        plan_title: "High Protein Cut",
        meals_list: "Breakfast: Oats",
        macros_summary: "Calories: 2100",
    };

    it.each(Object.values(TemplateId))("builds valid send payload for %s", (id) => {
        const payload = buildSendPayload(id, baseContext);
        expect(payload.name).toBeTruthy();
        expect(payload.language).toEqual({ code: "en" });
        expect(payload.components).toHaveLength(1);
        expect(payload.components[0].type).toBe("body");

        const params = payload.components[0].parameters;
        expect(Array.isArray(params)).toBe(true);
        expect(params.length).toBe(META_TEMPLATES[id].paramKeys.length);

        // Every parameter should be a text type with a non-empty string
        for (const param of params) {
            expect(param.type).toBe("text");
            expect(typeof param.text).toBe("string");
        }
    });

    it("exercise_video payload should build details from context", () => {
        const payload = buildSendPayload(TemplateId.EXERCISE_VIDEO, baseContext);
        const detailsParam = payload.components[0].parameters[1]; // _exercise_details
        expect(detailsParam.text).toContain("Hamstrings & Glutes");
        expect(detailsParam.text).toContain("4");
    });
});
