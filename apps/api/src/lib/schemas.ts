import { z } from "zod";

// --- Client schemas ---

export const createClientSchema = z.object({
    name: z.string().min(1).max(100),
    phone: z.string().regex(/^\+?[1-9]\d{6,14}$/).optional().nullable(),
    email: z.string().email().max(255).optional().nullable(),
    goals: z.string().max(2000).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    preferredChannel: z.enum(["WHATSAPP", "TELEGRAM"]).optional(),
    // status intentionally omitted — always PENDING_PAYMENT on creation
    // Onboarding-specific fields
    sessionBlock: z.object({
        totalSessions: z.number().int().min(1).max(200),
        pricePerSession: z.number().int().min(0),
    }).optional(),
    monthlyRate: z.number().int().min(0).optional(),
    source: z.string().max(50).optional(),
});

export const updateClientSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    phone: z.string().regex(/^\+?[1-9]\d{6,14}$/).optional().nullable(),
    email: z.string().email().max(255).optional().nullable(),
    goals: z.string().max(2000).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    status: z.enum([
        "PENDING_PAYMENT", "INTAKE_SENT", "INTAKE_COMPLETE",
        "PLAN_ASSIGNED", "ACTIVE", "PAUSED", "INACTIVE",
    ]).optional(),
    preferredChannel: z.enum(["WHATSAPP", "TELEGRAM"]).optional(),
    timezone: z.string().max(50).optional(),
});

// --- Plan schemas ---

const exerciseInDaySchema = z.object({
    exerciseId: z.string().uuid(),
    sets: z.number().int().min(1).max(100).optional(),
    reps: z.string().max(50).optional(),
    rest: z.string().max(50).optional(),
    notes: z.string().max(500).optional().nullable(),
});

const daySchema = z.object({
    dayNumber: z.number().int().min(1).max(14),
    title: z.string().min(1).max(100).optional().nullable(),
    exercises: z.array(exerciseInDaySchema).min(1),
});

export const createPlanSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional().nullable(),
    isTemplate: z.boolean().optional(),
    days: z.array(daySchema).min(1).max(14),
});

export const generatePlanSchema = z.object({
    clientId: z.string().uuid().optional(),
    instructions: z.string().max(1000).optional(),
});
