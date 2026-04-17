import { describe, it, expect } from "vitest";
import { TemplateId } from "@fitflow/shared";
import { getTemplate, getAllTemplateIds } from "../index";

describe("Template Registry", () => {
    it("getTemplate returns a valid definition for known IDs", () => {
        const template = getTemplate(TemplateId.WORKOUT_DAILY);
        expect(template).toBeDefined();
        expect(template.id).toBe(TemplateId.WORKOUT_DAILY);
        expect(template.description).toBeTruthy();
        expect(template.channels.telegram).toBeDefined();
        expect(template.channels.whatsapp).toBeDefined();
    });

    it("getTemplate throws for unknown ID", () => {
        expect(() => getTemplate("nonexistent.template" as TemplateId)).toThrow("Template not found");
    });

    it("getAllTemplateIds returns an array of TemplateId values", () => {
        const ids = getAllTemplateIds();
        expect(Array.isArray(ids)).toBe(true);
        expect(ids.length).toBeGreaterThan(0);
        // Every returned ID should be a valid TemplateId enum value
        const validIds = new Set(Object.values(TemplateId));
        for (const id of ids) {
            expect(validIds.has(id)).toBe(true);
        }
    });
});
