/**
 * Test data factories for FitFlow API tests.
 * Each factory returns a valid object with sensible defaults.
 * Override any field by passing a partial object.
 */

export function buildCoach(overrides: Record<string, any> = {}) {
    return {
        id: "test-coach-id",
        email: "coach@test.com",
        name: "Test Coach",
        slug: "test-coach-abc1",
        billingCurrency: "usd",
        stripeAccountId: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
        ...overrides,
    };
}

export function buildClient(overrides: Record<string, any> = {}) {
    return {
        id: "test-client-id",
        coachId: "test-coach-id",
        name: "Test Client",
        email: "client@test.com",
        phone: "447700900000",
        telegramChatId: null,
        preferredChannel: "WHATSAPP",
        status: "ACTIVE",
        timezone: "Europe/London",
        createdAt: new Date("2025-01-15"),
        updatedAt: new Date("2025-01-15"),
        ...overrides,
    };
}

export function buildWorkoutPlan(overrides: Record<string, any> = {}) {
    return {
        id: "test-plan-id",
        coachId: "test-coach-id",
        name: "Test 4-Week Plan",
        description: "A test workout plan",
        durationWeeks: 4,
        createdAt: new Date("2025-01-10"),
        updatedAt: new Date("2025-01-10"),
        ...overrides,
    };
}

export function buildPlanAssignment(overrides: Record<string, any> = {}) {
    return {
        id: "test-assignment-id",
        clientId: "test-client-id",
        planId: "test-plan-id",
        coachId: "test-coach-id",
        active: true,
        startDate: new Date("2025-02-01"),
        currentWeek: 1,
        currentDay: 1,
        scheduleDays: [1, 3, 5], // Mon, Wed, Fri
        compliance: 0,
        createdAt: new Date("2025-02-01"),
        updatedAt: new Date("2025-02-01"),
        ...overrides,
    };
}

export function buildCheckIn(overrides: Record<string, any> = {}) {
    return {
        id: "test-checkin-id",
        clientId: "test-client-id",
        weight: 80.5,
        weightUnit: "kg",
        energy: 4,
        sleep: "7-8 hours",
        notes: "Feeling good this week",
        createdAt: new Date("2025-02-07"),
        ...overrides,
    };
}

export function buildWorkoutLog(overrides: Record<string, any> = {}) {
    return {
        id: "test-workout-log-id",
        clientId: "test-client-id",
        assignmentId: "test-assignment-id",
        dayNumber: 1,
        status: "COMPLETED",
        rpe: 7,
        notes: null,
        createdAt: new Date("2025-02-03"),
        ...overrides,
    };
}

export function buildPayment(overrides: Record<string, any> = {}) {
    return {
        id: "test-payment-id",
        clientId: "test-client-id",
        coachId: "test-coach-id",
        amount: 5000,
        currency: "gbp",
        status: "SUCCEEDED",
        method: "STRIPE",
        stripeSessionId: "cs_test_123",
        createdAt: new Date("2025-01-20"),
        ...overrides,
    };
}

export function buildSubscription(overrides: Record<string, any> = {}) {
    return {
        id: "test-subscription-id",
        coachId: "test-coach-id",
        tier: "PRO",
        status: "ACTIVE",
        stripeSubscriptionId: "sub_test_123",
        stripeCustomerId: "cus_test_123",
        currentPeriodStart: new Date("2025-01-01"),
        currentPeriodEnd: new Date("2025-02-01"),
        trialEnd: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
        ...overrides,
    };
}

export function buildLead(overrides: Record<string, any> = {}) {
    return {
        id: "test-lead-id",
        coachId: "test-coach-id",
        name: "Test Lead",
        phone: "447700900001",
        email: "lead@test.com",
        status: "NEW",
        source: "WHATSAPP",
        offerId: null,
        createdAt: new Date("2025-02-10"),
        updatedAt: new Date("2025-02-10"),
        ...overrides,
    };
}

export function buildMessage(overrides: Record<string, any> = {}) {
    return {
        id: "test-message-id",
        clientId: "test-client-id",
        leadId: null,
        channel: "WHATSAPP",
        direction: "OUTBOUND",
        content: "Hello from FitFlow",
        metaMessageId: "wamid.test123",
        status: "sent",
        createdAt: new Date("2025-02-15"),
        ...overrides,
    };
}
