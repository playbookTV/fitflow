import { describe, it, expect } from "vitest";
import { TemplateId, ChannelType } from "@fitflow/shared";
import { renderTemplate, getAllTemplateIds } from "../index";

/**
 * Build a valid context object for any template.
 * Each template has its own required fields — this factory covers all of them.
 */
function makeTestContext(id: TemplateId): Record<string, any> {
    const base = {
        client_first_name: "Alex",
        coach_first_name: "Sam",
        offer_name: "12-Week Transform",
        intake_link: "https://fitflow.app/intake/abc123",
        payment_link: "https://pay.stripe.com/test",
        programme_start_date: "Monday 3rd February",
        next_checkin_day: "Sunday",
        workout_day_number: 3,
        workout_name: "Upper Body Push",
        exercise_list: "1. Bench Press 4x8\n2. OHP 3x10\n3. Lateral Raises 3x15",
        clientId: "test-client-id",
        programme_week: 2,
        total_weeks: 12,
        weekly_summary: "3/3 workouts done. 100% compliance.",
        compliance: 85,
        checkin_link: "https://fitflow.app/checkin/abc123",
        amount: "£50.00",
        renewal_date: "15th March 2025",
        renewal_amount: "£50.00",
        bank_transfer_details: "Sort: 12-34-56\nAccount: 12345678\nRef: Alex",
        broadcast_message: "Group session this Saturday at 10am.",
        exercise_name: "Romanian Deadlift",
        muscle_group: "Hamstrings & Glutes",
        sets: 4,
        reps: "10-12",
        instructions: "Hinge at the hips, keep a neutral spine.",
        // Meal template context
        day_number: 3,
        day_title: "High Carb Day",
        plan_title: "High Protein Cut",
        meals_list: "*Breakfast*\n  Oats & Protein \u2014 400 cal\n\n*Lunch*\n  Chicken & Rice \u2014 550 cal",
        protein: 180,
        carbs: 200,
        fat: 60,
        calories: 2100,
        total_prep_time: "~35 min",
    };

    return base;
}

const channels: ChannelType[] = ["whatsapp", "telegram"];

describe("Template Render System", () => {
    const allIds = getAllTemplateIds();

    it("should have all registered TemplateIds be valid enum values", () => {
        const enumValues = new Set(Object.values(TemplateId));
        for (const id of allIds) {
            expect(enumValues.has(id)).toBe(true);
        }
        // At least the core templates should be registered
        expect(allIds.length).toBeGreaterThanOrEqual(25);
    });

    describe.each(channels)("channel: %s", (channel) => {
        it.each(allIds)("renders %s without undefined or unresolved placeholders", (id) => {
            const ctx = makeTestContext(id);
            const result = renderTemplate(id, channel, ctx);

            expect(result).toBeDefined();
            expect(result.text).toBeTruthy();
            expect(result.text).not.toContain("undefined");
            expect(result.text).not.toContain("{{");
            expect(result.text).not.toContain("null");
        });

        it.each(allIds)("renders %s and returns a string text field", (id) => {
            const ctx = makeTestContext(id);
            const result = renderTemplate(id, channel, ctx);
            expect(typeof result.text).toBe("string");
            expect(result.text.length).toBeGreaterThan(0);
        });
    });

    describe("telegram-specific", () => {
        it("workout_daily should include buttons", () => {
            const result = renderTemplate(TemplateId.WORKOUT_DAILY, "telegram", makeTestContext(TemplateId.WORKOUT_DAILY));
            expect(result.buttons).toBeDefined();
            expect(result.buttons!.length).toBeGreaterThan(0);
            expect(result.parseMode).toBe("MarkdownV2");
        });
    });

    describe("whatsapp-specific", () => {
        it("workout_daily should include exercise list", () => {
            const ctx = makeTestContext(TemplateId.WORKOUT_DAILY);
            const result = renderTemplate(TemplateId.WORKOUT_DAILY, "whatsapp", ctx);
            expect(result.text).toContain("Bench Press");
            expect(result.text).toContain("Day 3");
        });

        it("workout_rest_day should mention client name", () => {
            const ctx = makeTestContext(TemplateId.WORKOUT_REST_DAY);
            const result = renderTemplate(TemplateId.WORKOUT_REST_DAY, "whatsapp", ctx);
            expect(result.text).toContain("Alex");
        });

        it("workout_daily should include buttons", () => {
            const ctx = makeTestContext(TemplateId.WORKOUT_DAILY);
            const result = renderTemplate(TemplateId.WORKOUT_DAILY, "whatsapp", ctx);
            expect(result.buttons).toBeDefined();
            expect(result.buttons!.length).toBeGreaterThan(0);
        });

        it("meal_daily should include buttons", () => {
            const ctx = makeTestContext(TemplateId.MEAL_DAILY);
            const result = renderTemplate(TemplateId.MEAL_DAILY, "whatsapp", ctx);
            expect(result.buttons).toBeDefined();
            expect(result.buttons![0].length).toBe(2);
        });

        it("checkin_weekly_prompt should include Start Check-in button", () => {
            const ctx = makeTestContext(TemplateId.CHECKIN_WEEKLY_PROMPT);
            const result = renderTemplate(TemplateId.CHECKIN_WEEKLY_PROMPT, "whatsapp", ctx);
            expect(result.buttons).toBeDefined();
            expect(result.buttons![0][0].text).toContain("Start Check-in");
        });
    });
});
