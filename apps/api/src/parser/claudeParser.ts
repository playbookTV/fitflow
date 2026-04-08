import { ParsedCommand } from "./regexParser";

export async function claudeParse(raw: string): Promise<ParsedCommand> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.ANTHROPIC_API_KEY!,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 200,
            messages: [
                {
                    role: "user",
                    content: `You are a parser for a fitness coaching app. Extract exercise info from this coach message.
Return ONLY valid JSON. No markdown, no explanation.

Message: "${raw}"

{
  "exerciseName": string | null,
  "muscleGroup": "chest"|"back"|"shoulders"|"biceps"|"triceps"|"quads"|"hamstrings"|"glutes"|"calves"|"core"|"full_body" | null,
  "equipment": "barbell"|"dumbbell"|"cable"|"machine"|"bodyweight"|"kettlebell"|"band" | null,
  "sets": number | null,
  "reps": number | null,
  "intensity": "heavy"|"moderate"|"light" | null
}`,
                },
            ],
        }),
    });

    const data = await res.json();
    const parsed = JSON.parse(data.content[0].text);
    return { ...parsed, raw, confidence: "low" as const };
}
