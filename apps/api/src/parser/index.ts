import { regexParse, ParsedCommand } from "./regexParser";
import { claudeParse } from "./claudeParser";

export type { ParsedCommand } from "./regexParser";

export async function parseExerciseCommand(
    input: string
): Promise<ParsedCommand | null> {
    // Layer 1: fast regex parse
    const fast = regexParse(input);
    if (fast && fast.confidence === "high") return fast;

    // Layer 2: Claude Haiku fallback
    try {
        return await claudeParse(input);
    } catch {
        return fast ?? null;
    }
}
