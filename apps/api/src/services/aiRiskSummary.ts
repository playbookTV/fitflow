import { env } from "../lib/env";
import { RiskFactors } from "./riskScorer";

interface ClientContext {
    name: string;
    goals: string | null;
    lastCheckInNotes: string | null;
}

interface RiskSummaryResult {
    summary: string;
    suggestion: string;
}

export async function generateRiskSummary(
    factors: RiskFactors,
    score: number,
    clientContext: ClientContext,
): Promise<RiskSummaryResult> {
    const systemPrompt = `You are a coaching assistant helping personal trainers retain clients.
Given the risk data below, write:
1. A concise 1-2 sentence summary of what's happening with this client.
2. A specific, actionable recommendation the coach can take right now.

Be empathetic and constructive. Use the client's first name. Be direct — no filler.
Return ONLY valid JSON: { "summary": string, "suggestion": string }`;

    const userMessage = `CLIENT: ${clientContext.name}
GOALS: ${clientContext.goals || "Not specified"}
LAST CHECK-IN NOTES: ${clientContext.lastCheckInNotes || "None"}

RISK SCORE: ${score}/100
FACTOR BREAKDOWN (0=healthy, 100=critical):
- Compliance (workout completion): ${factors.compliance}
- Engagement (message activity): ${factors.engagement}
- Activity (check-in frequency): ${factors.activity}
- Behavioral (energy/sleep trends): ${factors.behavioral}
- Payment status: ${factors.payment}`;

    try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": env.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 300,
                system: systemPrompt,
                messages: [{ role: "user", content: userMessage }],
            }),
        });

        if (!res.ok) {
            throw new Error(`Anthropic API error: ${res.status}`);
        }

        const data = await res.json();
        const parsed = JSON.parse(data.content[0].text);
        return {
            summary: String(parsed.summary || "").slice(0, 500),
            suggestion: String(parsed.suggestion || "").slice(0, 500),
        };
    } catch (error) {
        console.error("[aiRiskSummary] Failed to generate summary:", error);
        return {
            summary: `${clientContext.name.split(" ")[0]} has a risk score of ${score}. Review their recent activity for details.`,
            suggestion: "Check in with the client to understand their current situation.",
        };
    }
}
