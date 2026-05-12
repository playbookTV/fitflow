import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "./mocks/prisma";
import { mockEngagementQueue } from "./mocks/queue";
import { buildClient, buildPlanAssignment } from "./factories";

/**
 * Regression suite for the TenantGuard violations surfaced by Railway logs:
 * - WhatsApp button-reply handlers ("Done" tap)
 * - Message worker text-reply path ("DONE" typed)
 * - Engagement scheduler nightly scan
 *
 * Each test asserts every guarded Prisma call site uses a where clause that
 * passes the same heuristic the runtime guard applies (hasCoachScope), so
 * flipping PRISMA_TENANT_GUARD=throw won't break these flows.
 */

const COACH_A = "test-coach-id";
const CLIENT_A = "test-client-id";

// Mock side-effect dependencies that aren't under test here.
vi.mock("../lib/channels/channel-router", () => ({
    getChannel: vi.fn().mockResolvedValue({
        sendTemplate: vi.fn().mockResolvedValue({ success: true }),
        sendMessage: vi.fn().mockResolvedValue({ success: true }),
    }),
    getRecipientId: vi.fn().mockReturnValue("447700900000"),
}));

vi.mock("../lib/event-logger", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../lib/event-logger")>();
    return {
        ...actual,
        logEvent: vi.fn().mockResolvedValue(undefined),
    };
});

vi.mock("../workers/assert-send", () => ({
    assertSendSuccess: vi.fn(),
}));

vi.mock("../handlers/clientCommandRouter", () => ({
    handleCommand: vi.fn().mockResolvedValue(null),
}));

/** Mirrors apps/api/src/lib/prisma.ts isCoachScoped — keep in sync if that changes. */
function hasCoachScope(where: unknown): boolean {
    if (!where || typeof where !== "object") return false;
    const w = where as Record<string, unknown>;
    if (w.__unsafeGlobal === true) return true;
    if (w.coachId != null) return true;
    if (w.coach && typeof w.coach === "object" && Object.keys(w.coach).length > 0) return true;
    const tenantParents = ["client", "lead", "plan", "assignment", "mealPlan", "mealAssignment", "planAssignment", "offer"] as const;
    for (const key of tenantParents) {
        const child = w[key];
        if (child && typeof child === "object" && hasCoachScope(child)) return true;
    }
    if (Array.isArray(w.AND) && w.AND.length > 0 && w.AND.every(hasCoachScope)) return true;
    if (Array.isArray(w.OR) && w.OR.length > 0 && w.OR.every(hasCoachScope)) return true;
    return false;
}

function assertAllScoped(mock: ReturnType<typeof vi.fn>, label: string) {
    expect(mock, `${label} was never called`).toHaveBeenCalled();
    for (const call of mock.mock.calls) {
        const where = call[0]?.where;
        expect(hasCoachScope(where), `${label} where not coach-scoped: ${JSON.stringify(where)}`).toBe(true);
    }
}

describe("Tenant isolation — WhatsApp button reply (workout)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("handleWorkoutButtonReply scopes all guarded calls by coachId", async () => {
        const { handleWorkoutButtonReply } = await import("../routes/webhooks");

        prismaMock.planAssignment.findFirst.mockResolvedValueOnce(
            buildPlanAssignment({ startDate: new Date(Date.now() - 86400000) }),
        );
        prismaMock.workoutLog.create.mockResolvedValueOnce({});
        prismaMock.workoutLog.count.mockResolvedValueOnce(3);
        prismaMock.planAssignment.updateMany.mockResolvedValueOnce({ count: 1 });

        await handleWorkoutButtonReply(
            buildClient({ id: CLIENT_A, coachId: COACH_A }),
            "Done",
        );

        assertAllScoped(prismaMock.planAssignment.findFirst, "planAssignment.findFirst");
        assertAllScoped(prismaMock.workoutLog.count, "workoutLog.count");
        assertAllScoped(prismaMock.planAssignment.updateMany, "planAssignment.updateMany");

        // Specifically: prove no bare update slipped through
        expect(prismaMock.planAssignment.update).not.toHaveBeenCalled();
    });
});

describe("Tenant isolation — WhatsApp button reply (meal)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("handleMealButtonReply scopes all guarded calls by coachId", async () => {
        const { handleMealButtonReply } = await import("../routes/webhooks");

        prismaMock.mealAssignment.findFirst.mockResolvedValueOnce({
            id: "test-meal-assignment-id",
            clientId: CLIENT_A,
            startDate: new Date(Date.now() - 86400000),
        } as never);
        prismaMock.mealLog.create.mockResolvedValueOnce({});
        prismaMock.mealLog.count.mockResolvedValueOnce(2);
        prismaMock.mealLog.count.mockResolvedValueOnce(1);
        prismaMock.mealAssignment.updateMany.mockResolvedValueOnce({ count: 1 });

        await handleMealButtonReply(
            buildClient({ id: CLIENT_A, coachId: COACH_A }),
            "Done",
        );

        assertAllScoped(prismaMock.mealAssignment.findFirst, "mealAssignment.findFirst");
        assertAllScoped(prismaMock.mealLog.count, "mealLog.count");
        assertAllScoped(prismaMock.mealAssignment.updateMany, "mealAssignment.updateMany");
        expect(prismaMock.mealAssignment.update).not.toHaveBeenCalled();
    });
});

describe("Tenant isolation — WhatsApp Flow response (workout log)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("handleWorkoutLogFlowResponse scopes all guarded calls by coachId", async () => {
        const { handleWorkoutLogFlowResponse } = await import("../routes/webhooks");

        prismaMock.planAssignment.findFirst.mockResolvedValueOnce(
            buildPlanAssignment({ startDate: new Date(Date.now() - 7 * 86400000) }),
        );
        prismaMock.workoutLog.create.mockResolvedValueOnce({ id: "wl-1" });
        prismaMock.workoutLog.count.mockResolvedValueOnce(5);
        prismaMock.planAssignment.updateMany.mockResolvedValueOnce({ count: 1 });

        const result = await handleWorkoutLogFlowResponse(CLIENT_A, COACH_A, {
            status: "COMPLETED",
            rpe: "7",
            notes: "Felt strong",
        } as never);

        expect(result).toBeTruthy();
        assertAllScoped(prismaMock.planAssignment.findFirst, "planAssignment.findFirst");
        assertAllScoped(prismaMock.workoutLog.count, "workoutLog.count");
        assertAllScoped(prismaMock.planAssignment.updateMany, "planAssignment.updateMany");
        expect(prismaMock.planAssignment.update).not.toHaveBeenCalled();
    });
});

describe("Tenant isolation — engagement scheduler scan", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("top-level planAssignment.findMany uses __unsafeGlobal escape hatch", async () => {
        const { runEngagementScan } = await import("../jobs/engagement-scheduler");

        // Empty active assignments — covers the cross-tenant scan call only.
        prismaMock.planAssignment.findMany.mockResolvedValueOnce([]);

        await runEngagementScan();

        expect(prismaMock.planAssignment.findMany).toHaveBeenCalledOnce();
        const call = prismaMock.planAssignment.findMany.mock.calls[0][0];
        expect(hasCoachScope(call.where)).toBe(true);
        expect(call.where.__unsafeGlobal).toBe(true);
    });

    it("per-client workout queries scope by coachId via client relation", async () => {
        const { runEngagementScan } = await import("../jobs/engagement-scheduler");

        const now = new Date();
        const today = now.getDay();

        prismaMock.planAssignment.findMany.mockResolvedValueOnce([
            {
                id: "assignment-1",
                clientId: CLIENT_A,
                isActive: true,
                startDate: new Date(now.getTime() - 30 * 86400000),
                scheduleDays: [today],
                client: { id: CLIENT_A, coachId: COACH_A },
                plan: { id: "plan-1", title: "Plan", days: [{}, {}, {}, {}] },
            },
        ] as never);

        prismaMock.workoutLog.findFirst.mockResolvedValue(null);
        prismaMock.workoutLog.count.mockResolvedValue(0);
        prismaMock.eventLog.findFirst.mockResolvedValue(null);
        prismaMock.message.findFirst.mockResolvedValue(null);

        await runEngagementScan();

        assertAllScoped(prismaMock.workoutLog.findFirst, "workoutLog.findFirst");
        assertAllScoped(prismaMock.workoutLog.count, "workoutLog.count");
        assertAllScoped(prismaMock.message.findFirst, "message.findFirst");
        expect(mockEngagementQueue.add).toHaveBeenCalled();
    });
});

describe("Tenant isolation — message worker text reply", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("workout DONE text reply scopes all guarded calls by coachId", async () => {
        const { processMessageJob } = await import("../workers/workoutProcessor");

        prismaMock.eventLog.findFirst.mockResolvedValueOnce({
            eventType: "workout.delivered",
            createdAt: new Date(),
        } as never);
        prismaMock.planAssignment.findFirst.mockResolvedValueOnce({
            ...buildPlanAssignment(),
            startDate: new Date(Date.now() - 86400000),
            client: { ...buildClient(), coach: {} },
        } as never);
        prismaMock.workoutLog.create.mockResolvedValueOnce({});
        prismaMock.workoutLog.count.mockResolvedValueOnce(1);
        prismaMock.planAssignment.updateMany.mockResolvedValueOnce({ count: 1 });

        await processMessageJob({
            name: "process-message",
            data: { clientId: CLIENT_A, coachId: COACH_A, body: "Done", channel: "WHATSAPP" },
        } as never);

        assertAllScoped(prismaMock.planAssignment.findFirst, "planAssignment.findFirst");
        assertAllScoped(prismaMock.workoutLog.count, "workoutLog.count");
        assertAllScoped(prismaMock.planAssignment.updateMany, "planAssignment.updateMany");
        expect(prismaMock.planAssignment.update).not.toHaveBeenCalled();
    });

    it("meal DONE text reply scopes all guarded calls by coachId", async () => {
        const { processMessageJob } = await import("../workers/workoutProcessor");

        prismaMock.eventLog.findFirst.mockResolvedValueOnce({
            eventType: "meal.delivered",
            createdAt: new Date(),
        } as never);
        prismaMock.mealAssignment.findFirst.mockResolvedValueOnce({
            id: "ma-1",
            clientId: CLIENT_A,
            startDate: new Date(Date.now() - 86400000),
            client: { ...buildClient(), coach: {} },
        } as never);
        prismaMock.mealLog.create.mockResolvedValueOnce({});
        prismaMock.mealLog.count.mockResolvedValue(2);
        prismaMock.mealAssignment.updateMany.mockResolvedValueOnce({ count: 1 });

        await processMessageJob({
            name: "process-message",
            data: { clientId: CLIENT_A, coachId: COACH_A, body: "Done", channel: "WHATSAPP" },
        } as never);

        assertAllScoped(prismaMock.mealAssignment.findFirst, "mealAssignment.findFirst");
        assertAllScoped(prismaMock.mealLog.count, "mealLog.count");
        assertAllScoped(prismaMock.mealAssignment.updateMany, "mealAssignment.updateMany");
        expect(prismaMock.mealAssignment.update).not.toHaveBeenCalled();
    });
});
