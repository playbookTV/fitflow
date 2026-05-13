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

// Anthropic explicitly recommends retrying these. 529 = Overloaded, 429 = rate-limited,
// 503 = service unavailable. Everything else is treated as a hard failure.
const TRANSIENT_STATUSES = new Set([429, 503, 529]);
const MAX_ATTEMPTS = 3;

class AnthropicApiError extends Error {
    constructor(public status: number) {
        super(`Anthropic API error: ${status}`);
        this.name = "AnthropicApiError";
    }
    get transient(): boolean {
        return TRANSIENT_STATUSES.has(this.status);
    }
}

function backoffDelayMs(attempt: number): number {
    // 1s, 2s, 4s with up to ±25% jitter. Total worst-case ~7s across 3 attempts.
    const base = 1000 * 2 ** (attempt - 1);
    const jitter = base * 0.25 * (Math.random() * 2 - 1);
    return Math.round(base + jitter);
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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
        const data = await callAnthropicWithRetry(systemPrompt, userMessage);
        const raw = String(data.content[0].text).trim();
        const unfenced = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
        const parsed = JSON.parse(unfenced);
        return {
            summary: String(parsed.summary || "").slice(0, 500),
            suggestion: String(parsed.suggestion || "").slice(0, 500),
        };
    } catch (error) {
        // Transient upstream failures are expected occasionally; surface as warn,
        // not error, so they don't drown the alert signal for real bugs.
        if (error instanceof AnthropicApiError && error.transient) {
            console.warn(`[aiRiskSummary] Anthropic overloaded after ${MAX_ATTEMPTS} attempts (status ${error.status}); using fallback summary`);
        } else {
            console.error("[aiRiskSummary] Failed to generate summary:", error);
        }
        return {
            summary: `${clientContext.name.split(" ")[0]} has a risk score of ${score}. Review their recent activity for details.`,
            suggestion: "Check in with the client to understand their current situation.",
        };
    }
}

async function callAnthropicWithRetry(systemPrompt: string, userMessage: string): Promise<any> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
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

        if (res.ok) {
            return await res.json();
        }

        const err = new AnthropicApiError(res.status);
        lastError = err;

        if (!err.transient || attempt === MAX_ATTEMPTS) {
            throw err;
        }

        await sleep(backoffDelayMs(attempt));
    }

    // Unreachable — loop either returns or throws — but TS needs the guard.
    throw lastError;
}
