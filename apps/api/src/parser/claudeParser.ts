import { ParsedCommand } from "./regexParser";
import { env } from "../lib/env";

export async function claudeParse(raw: string): Promise<ParsedCommand> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 200,
            system: `You are a parser for a fitness coaching app. Extract exercise info from coach messages.
Return ONLY valid JSON matching this schema exactly. No markdown, no explanation.
{
  "exerciseName": string | null,
  "muscleGroup": "chest"|"back"|"shoulders"|"biceps"|"triceps"|"quads"|"hamstrings"|"glutes"|"calves"|"core"|"full_body" | null,
  "equipment": "barbell"|"dumbbell"|"cable"|"machine"|"bodyweight"|"kettlebell"|"band" | null,
  "sets": number | null,
  "reps": number | null,
  "intensity": "heavy"|"moderate"|"light" | null
}`,
            messages: [
                { role: "user", content: raw },
            ],
        }),
    });

    const data = await res.json();
    try {
        const parsed = JSON.parse(data.content[0].text);
        return { ...parsed, raw, confidence: "low" as const };
    } catch {
        return { raw, confidence: "low" as const } as ParsedCommand;
    }
}
