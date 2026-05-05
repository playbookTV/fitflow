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
    // status intentionally omitted — transitions must go through dedicated flows
    // (payment confirmation, intake completion, plan assignment, etc.)
    preferredChannel: z.enum(["WHATSAPP", "TELEGRAM"]).optional(),
    timezone: z.string().max(50).optional(),
    monthlyRate: z.number().int().min(0).optional(),
    conversationPinned: z.boolean().optional(),
    conversationArchived: z.boolean().optional(),
});

// --- Coach schemas ---

// Allow http(s) URLs only (rejects javascript:, data:, etc.) for fields rendered as <img src>.
const httpUrl = z
    .string()
    .url()
    .max(2048)
    .refine((u) => /^https?:\/\//i.test(u), { message: "URL must use http(s)" });

export const updateCoachSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    slug: z.string().max(30).optional(),
    phone: z.string().regex(/^\+?[1-9]\d{6,14}$/).optional().nullable(),
    businessName: z.string().max(120).optional().nullable(),
    timezone: z.string().max(50).optional(),
    defaultChannel: z.enum(["WHATSAPP", "TELEGRAM"]).optional().nullable(),
    specialities: z.array(z.string().max(60)).max(20).optional(),
    defaultPaymentModel: z.enum(["SESSION_BLOCKS", "PER_SESSION", "MONTHLY_RETAINER"]).optional().nullable(),
    activeClientRange: z.string().max(50).optional().nullable(),
    onboardingStep: z.number().int().min(0).max(20).optional(),
    onboardingCompleted: z.boolean().optional(),
    bio: z.string().max(200).optional().nullable(),
    avatarUrl: httpUrl.optional().nullable(),
    profileVisible: z.boolean().optional(),
    showRatesPublicly: z.boolean().optional(),
    showWhatsapp: z.boolean().optional(),
    showTelegram: z.boolean().optional(),
    defaultPricePerSession: z.number().int().min(0).max(10_000_000).optional().nullable(),
    defaultSessionsPerBlock: z.number().int().min(1).max(500).optional().nullable(),
    defaultMonthlyRate: z.number().int().min(0).max(10_000_000).optional().nullable(),
    bankDetails: z.string().max(2000).optional().nullable(),
}).strict();

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

// PUT /plans/:id replaces the full plan, so it requires the same shape as create.
export const updatePlanSchema = createPlanSchema;

export const generatePlanSchema = z.object({
    clientId: z.string().uuid().optional(),
    instructions: z.string().max(1000).optional(),
});
