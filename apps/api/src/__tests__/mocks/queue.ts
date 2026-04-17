import { vi } from "vitest";

const createMockQueue = (name: string) => ({
    add: vi.fn().mockResolvedValue({ id: `test-job-${name}`, name }),
    addBulk: vi.fn().mockResolvedValue([]),
    getJobs: vi.fn().mockResolvedValue([]),
    obliterate: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    name,
});

export const mockWorkoutQueue = createMockQueue("workout-delivery");
export const mockCheckinQueue = createMockQueue("checkin-reminders");
export const mockOnboardingQueue = createMockQueue("onboarding-intake");
export const mockRenewalQueue = createMockQueue("renewal-reminders");
export const mockEngagementQueue = createMockQueue("engagement");
export const mockMessageQueue = createMockQueue("message-processing");
export const mockMealQueue = createMockQueue("meal-delivery");

vi.mock("../../lib/queue", () => ({
    workoutQueue: mockWorkoutQueue,
    checkinQueue: mockCheckinQueue,
    onboardingQueue: mockOnboardingQueue,
    renewalQueue: mockRenewalQueue,
    engagementQueue: mockEngagementQueue,
    messageQueue: mockMessageQueue,
    mealQueue: mockMealQueue,
}));

vi.mock("../../lib/redis", () => ({
    redis: {
        status: "ready",
        connect: vi.fn(),
        disconnect: vi.fn(),
        quit: vi.fn(),
    },
}));
