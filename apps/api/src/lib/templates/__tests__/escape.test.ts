import { describe, it, expect } from "vitest";
import { escapeMarkdownV2 } from "../escape";

describe("escapeMarkdownV2", () => {
    it("escapes special Telegram MarkdownV2 characters", () => {
        expect(escapeMarkdownV2("Hello_World")).toBe("Hello\\_World");
        expect(escapeMarkdownV2("**bold**")).toBe("\\*\\*bold\\*\\*");
        expect(escapeMarkdownV2("[link](url)")).toBe("\\[link\\]\\(url\\)");
        expect(escapeMarkdownV2("1 + 2 = 3")).toBe("1 \\+ 2 \\= 3");
    });

    it("handles empty string", () => {
        expect(escapeMarkdownV2("")).toBe("");
    });

    it("leaves plain text unchanged", () => {
        expect(escapeMarkdownV2("Hello World")).toBe("Hello World");
        expect(escapeMarkdownV2("abc123")).toBe("abc123");
    });

    it("escapes multiple special chars in sequence", () => {
        expect(escapeMarkdownV2("~`#")).toBe("\\~\\`\\#");
    });

    it("escapes dot and exclamation mark", () => {
        expect(escapeMarkdownV2("Hello!")).toBe("Hello\\!");
        expect(escapeMarkdownV2("End.")).toBe("End\\.");
    });

    it("escapes pipe and curly braces", () => {
        expect(escapeMarkdownV2("{test|value}")).toBe("\\{test\\|value\\}");
    });

    it("escapes backslash", () => {
        expect(escapeMarkdownV2("path\\to")).toBe("path\\\\to");
    });
});
