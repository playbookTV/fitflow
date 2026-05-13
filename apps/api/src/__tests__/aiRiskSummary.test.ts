import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateRiskSummary } from "../services/aiRiskSummary";
import type { RiskFactors } from "../services/riskScorer";

const factors: RiskFactors = {
    compliance: 50,
    engagement: 40,
    activity: 30,
    behavioral: 20,
    payment: 0,
};

const clientContext = { name: "Sam Carter", goals: null, lastCheckInNotes: null };

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

function overloadedResponse(): Response {
    return new Response("Overloaded", { status: 529 });
}

function happyPayload() {
    return {
        content: [
            {
                text: JSON.stringify({
                    summary: "Sam is at risk.",
                    suggestion: "Send a check-in message.",
                }),
            },
        ],
    };
}

describe("aiRiskSummary", () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;
    let errorSpy: ReturnType<typeof vi.spyOn>;
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        // Sleep gets in the way of test speed; stub it to resolve immediately.
        vi.spyOn(global, "setTimeout").mockImplementation(((fn: () => void) => {
            fn();
            return 0 as never;
        }) as never);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("returns parsed summary on first-attempt success", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(happyPayload()));

        const result = await generateRiskSummary(factors, 65, clientContext);

        expect(result.summary).toBe("Sam is at risk.");
        expect(result.suggestion).toBe("Send a check-in message.");
        expect(fetchMock).toHaveBeenCalledOnce();
        expect(warnSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
    });

    it("retries on 529 and succeeds on a later attempt", async () => {
        fetchMock
            .mockResolvedValueOnce(overloadedResponse())
            .mockResolvedValueOnce(jsonResponse(happyPayload()));

        const result = await generateRiskSummary(factors, 65, clientContext);

        expect(result.summary).toBe("Sam is at risk.");
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(warnSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
    });

    it("retries on 429 and succeeds on a later attempt", async () => {
        fetchMock
            .mockResolvedValueOnce(new Response("Rate limited", { status: 429 }))
            .mockResolvedValueOnce(jsonResponse(happyPayload()));

        const result = await generateRiskSummary(factors, 65, clientContext);

        expect(result.summary).toBe("Sam is at risk.");
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("falls back with a warn (not error) after exhausting retries on 529", async () => {
        fetchMock
            .mockResolvedValueOnce(overloadedResponse())
            .mockResolvedValueOnce(overloadedResponse())
            .mockResolvedValueOnce(overloadedResponse());

        const result = await generateRiskSummary(factors, 65, clientContext);

        expect(result.summary).toContain("Sam");
        expect(result.summary).toContain("65");
        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(warnSpy).toHaveBeenCalledOnce();
        expect(warnSpy.mock.calls[0][0]).toMatch(/Anthropic overloaded.*529/);
        expect(errorSpy).not.toHaveBeenCalled();
    });

    it("falls back with an error (not warn) on a non-transient 5xx", async () => {
        fetchMock.mockResolvedValueOnce(new Response("Server error", { status: 500 }));

        const result = await generateRiskSummary(factors, 65, clientContext);

        expect(result.summary).toContain("Sam");
        expect(fetchMock).toHaveBeenCalledOnce(); // no retry for 500
        expect(errorSpy).toHaveBeenCalledOnce();
        expect(warnSpy).not.toHaveBeenCalled();
    });

    it("falls back with an error on 4xx client errors", async () => {
        fetchMock.mockResolvedValueOnce(new Response("Bad request", { status: 400 }));

        const result = await generateRiskSummary(factors, 65, clientContext);

        expect(result.summary).toContain("Sam");
        expect(fetchMock).toHaveBeenCalledOnce();
        expect(errorSpy).toHaveBeenCalledOnce();
        expect(warnSpy).not.toHaveBeenCalled();
    });
});
