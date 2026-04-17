import { vi } from "vitest";

// Deep mock of PrismaClient — add model methods as needed
export const prismaMock = {
    coach: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
    },
    client: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
    },
    workoutPlan: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    workoutDay: {
        findMany: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
    },
    workoutExercise: {
        findMany: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
    },
    planAssignment: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
    },
    checkIn: {
        findMany: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
    },
    workoutLog: {
        findMany: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
    },
    payment: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
    },
    subscription: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        upsert: vi.fn(),
    },
    message: {
        findMany: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
    },
    lead: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
    },
    offer: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    eventLog: {
        create: vi.fn(),
        findMany: vi.fn(),
    },
    shortLink: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    exercise: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
    },
    mealPlan: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    mealAssignment: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
    },
    $transaction: vi.fn((fn: any) => {
        if (typeof fn === "function") {
            return fn(prismaMock);
        }
        return Promise.all(fn);
    }),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
};

vi.mock("../../lib/prisma", () => ({
    prisma: prismaMock,
    default: prismaMock,
}));
