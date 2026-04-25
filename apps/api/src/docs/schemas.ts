/**
 * OpenAPI Response Schemas
 *
 * Zod schemas that describe the shapes returned by every API endpoint.
 * These mirror Prisma model shapes but include computed fields that only
 * exist at runtime (e.g. stripeConnected, daysPerWeek, unreadCount).
 *
 * Used by the OpenAPI registry (openapi.ts) to generate openapi.json.
 */
import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

// ══════════════════════════════════════════════════════════════
// ENUMS (mirror Prisma enums)
// ══════════════════════════════════════════════════════════════

export const MessageChannelEnum = z.enum(["WHATSAPP", "TELEGRAM"]).openapi("MessageChannel");
export const ClientStatusEnum = z.enum([
    "PENDING_PAYMENT", "INTAKE_SENT", "INTAKE_COMPLETE",
    "PLAN_ASSIGNED", "ACTIVE", "PAUSED", "INACTIVE",
]).openapi("ClientStatus");
export const PaymentModelEnum = z.enum(["SESSION_BLOCKS", "PER_SESSION", "MONTHLY_RETAINER"]).openapi("PaymentModel");
export const PaymentStatusEnum = z.enum(["PENDING", "SUCCEEDED", "FAILED"]).openapi("PaymentStatus");
export const PaymentMethodEnum = z.enum(["STRIPE", "BANK_TRANSFER"]).openapi("PaymentMethod");
export const WorkoutStatusEnum = z.enum(["COMPLETED", "SKIPPED", "MODIFIED"]).openapi("WorkoutStatus");
export const MealStatusEnum = z.enum(["COMPLETED", "SKIPPED", "MODIFIED"]).openapi("MealStatus");
export const LeadStatusEnum = z.enum(["NEW", "INTAKE_COMPLETE", "PAYMENT_PENDING", "CONVERTED", "REJECTED"]).openapi("LeadStatus");
export const SubscriptionTierEnum = z.enum(["STARTER", "PRO", "STUDIO"]).openapi("SubscriptionTier");
export const SubscriptionStatusEnum = z.enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "UNPAID", "INCOMPLETE"]).openapi("SubscriptionStatus");
export const BillingIntervalEnum = z.enum(["MONTHLY", "ANNUAL"]).openapi("BillingInterval");
export const RiskLevelEnum = z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]).openapi("RiskLevel");
export const MessageDirectionEnum = z.enum(["INBOUND", "OUTBOUND"]).openapi("MessageDirection");

// ══════════════════════════════════════════════════════════════
// COMMON
// ══════════════════════════════════════════════════════════════

export const ErrorResponse = z.object({
    error: z.string(),
    code: z.string().optional(),
    details: z.record(z.any()).optional(),
}).openapi("ErrorResponse");

export const SuccessResponse = z.object({
    success: z.literal(true),
}).openapi("SuccessResponse");

export const HealthResponse = z.object({
    status: z.literal("ok"),
    timestamp: z.string().datetime(),
}).openapi("HealthResponse");

// ══════════════════════════════════════════════════════════════
// CLIENTS
// ══════════════════════════════════════════════════════════════

export const SessionBlockSchema = z.object({
    id: z.string().uuid(),
    clientId: z.string().uuid(),
    totalSessions: z.number().int(),
    usedSessions: z.number().int(),
    pricePerSession: z.number().int(),
    currency: z.string(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
}).openapi("SessionBlock");

export const CheckInSchema = z.object({
    id: z.string().uuid(),
    clientId: z.string().uuid(),
    weight: z.number().nullable(),
    energy: z.number().int().nullable(),
    sleep: z.string().nullable(),
    notes: z.string().nullable(),
    photoUrl: z.string().nullable(),
    createdAt: z.string().datetime(),
}).openapi("CheckIn");

export const WorkoutLogSchema = z.object({
    id: z.string().uuid(),
    clientId: z.string().uuid(),
    assignmentId: z.string().uuid(),
    dayNumber: z.number().int(),
    status: WorkoutStatusEnum,
    notes: z.string().nullable(),
    createdAt: z.string().datetime(),
}).openapi("WorkoutLog");

export const MessageSchema = z.object({
    id: z.string().uuid(),
    clientId: z.string().uuid().nullable(),
    leadId: z.string().uuid().nullable(),
    channel: MessageChannelEnum,
    direction: MessageDirectionEnum,
    content: z.string(),
    metaMessageId: z.string().nullable(),
    status: z.string().nullable(),
    createdAt: z.string().datetime(),
}).openapi("Message");

export const ClientResponse = z.object({
    id: z.string().uuid(),
    coachId: z.string().uuid(),
    name: z.string(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    telegramChatId: z.string().nullable(),
    goals: z.string().nullable(),
    notes: z.string().nullable(),
    status: ClientStatusEnum,
    intakeToken: z.string().nullable(),
    timezone: z.string(),
    preferredChannel: MessageChannelEnum,
    monthlyRate: z.number().int().nullable(),
    conversationPinned: z.boolean(),
    conversationArchived: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
}).openapi("Client");

export const PlanAssignmentSchema = z.object({
    id: z.string().uuid(),
    clientId: z.string().uuid(),
    planId: z.string().uuid(),
    startDate: z.string().datetime(),
    scheduleDays: z.array(z.number().int()),
    isActive: z.boolean(),
    compliance: z.number().int(),
    plan: z.object({
        id: z.string().uuid(),
        title: z.string(),
        description: z.string().nullable(),
    }).optional(),
}).openapi("PlanAssignment");

export const ClientDetailResponse = ClientResponse.extend({
    assignments: z.array(PlanAssignmentSchema),
    checkIns: z.array(CheckInSchema),
    workoutLogs: z.array(WorkoutLogSchema),
    messages: z.array(MessageSchema),
}).openapi("ClientDetail");

export const CreateClientResponse = z.object({
    client: ClientResponse,
    sessionBlock: SessionBlockSchema.optional(),
}).openapi("CreateClientResponse");

// ══════════════════════════════════════════════════════════════
// EXERCISES
// ══════════════════════════════════════════════════════════════

export const ExerciseResponse = z.object({
    id: z.string().uuid(),
    name: z.string(),
    category: z.string(),
    muscles: z.array(z.string()),
    demoVideoUrl: z.string().nullable(),
    ymoveId: z.string().nullable(),
}).openapi("Exercise");

export const UnifiedSearchResponse = z.object({
    results: z.array(ExerciseResponse),
    ymoveUnavailable: z.boolean().optional(),
}).openapi("UnifiedSearchResponse");

// ══════════════════════════════════════════════════════════════
// PLANS
// ══════════════════════════════════════════════════════════════

export const WorkoutExerciseSchema = z.object({
    id: z.string().uuid(),
    dayId: z.string().uuid(),
    exerciseId: z.string().uuid(),
    order: z.number().int(),
    sets: z.number().int(),
    reps: z.string().nullable(),
    rest: z.string().nullable(),
    notes: z.string().nullable(),
    exercise: ExerciseResponse.optional(),
}).openapi("WorkoutExercise");

export const WorkoutDaySchema = z.object({
    id: z.string().uuid(),
    planId: z.string().uuid(),
    dayNumber: z.number().int(),
    title: z.string().nullable(),
    exercises: z.array(WorkoutExerciseSchema),
}).openapi("WorkoutDay");

export const PlanResponse = z.object({
    id: z.string().uuid(),
    coachId: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    isTemplate: z.boolean(),
    tags: z.array(z.string()),
    days: z.array(WorkoutDaySchema),
    daysPerWeek: z.number().int().optional(),
    totalExercises: z.number().int().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
}).openapi("WorkoutPlan");

// ══════════════════════════════════════════════════════════════
// MEAL PLANS
// ══════════════════════════════════════════════════════════════

export const MealSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    category: z.string(),
    protein: z.number().nullable(),
    carbs: z.number().nullable(),
    fat: z.number().nullable(),
    calories: z.number().int().nullable(),
    ingredients: z.array(z.string()),
    prepTime: z.string().nullable(),
    recipeUrl: z.string().nullable(),
    spoonacularId: z.number().int().nullable(),
    imageUrl: z.string().nullable(),
}).openapi("Meal");

export const MealEntrySchema = z.object({
    id: z.string().uuid(),
    dayId: z.string().uuid(),
    mealId: z.string().uuid(),
    order: z.number().int(),
    servingSize: z.string().nullable(),
    notes: z.string().nullable(),
    meal: MealSchema.optional(),
}).openapi("MealEntry");

export const MealDaySchema = z.object({
    id: z.string().uuid(),
    planId: z.string().uuid(),
    dayNumber: z.number().int(),
    title: z.string().nullable(),
    entries: z.array(MealEntrySchema),
}).openapi("MealDay");

export const MealPlanResponse = z.object({
    id: z.string().uuid(),
    coachId: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    isTemplate: z.boolean(),
    tags: z.array(z.string()),
    days: z.array(MealDaySchema),
    daysPerWeek: z.number().int().optional(),
    totalMeals: z.number().int().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
}).openapi("MealPlan");

export const MealAssignmentSchema = z.object({
    id: z.string().uuid(),
    clientId: z.string().uuid(),
    planId: z.string().uuid(),
    startDate: z.string().datetime(),
    scheduleDays: z.array(z.number().int()),
    isActive: z.boolean(),
    compliance: z.number().int(),
    plan: MealPlanResponse.optional(),
}).openapi("MealAssignment");

export const MealLogSchema = z.object({
    id: z.string().uuid(),
    clientId: z.string().uuid(),
    assignmentId: z.string().uuid(),
    dayNumber: z.number().int(),
    status: MealStatusEnum,
    notes: z.string().nullable(),
    createdAt: z.string().datetime(),
}).openapi("MealLog");

// ══════════════════════════════════════════════════════════════
// COACHES
// ══════════════════════════════════════════════════════════════

export const CoachProfileResponse = z.object({
    id: z.string().uuid(),
    email: z.string(),
    name: z.string().nullable(),
    slug: z.string().nullable(),
    phone: z.string().nullable(),
    businessName: z.string().nullable(),
    timezone: z.string(),
    stripeAccountId: z.string().nullable(),
    stripeCustomerId: z.string().nullable(),
    billingCurrency: z.string(),
    bankDetails: z.string().nullable(),
    defaultChannel: MessageChannelEnum.nullable(),
    specialities: z.array(z.string()),
    defaultPaymentModel: PaymentModelEnum.nullable(),
    activeClientRange: z.string().nullable(),
    onboardingCompleted: z.boolean(),
    onboardingStep: z.number().int(),
    bio: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    profileVisible: z.boolean(),
    showRatesPublicly: z.boolean(),
    showWhatsapp: z.boolean(),
    showTelegram: z.boolean(),
    defaultPricePerSession: z.number().int().nullable(),
    defaultSessionsPerBlock: z.number().int().nullable(),
    defaultMonthlyRate: z.number().int().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    // Computed fields
    stripeConnected: z.boolean(),
    whatsappConnected: z.boolean(),
    telegramConnected: z.boolean(),
    telegramBotUsername: z.string().nullable().optional(),
    telegramDeepLink: z.string().nullable().optional(),
}).openapi("CoachProfile");

export const ChannelStatusResponse = z.object({
    whatsapp: z.object({
        connected: z.boolean(),
        phoneNumber: z.string().optional(),
        waLink: z.string().optional(),
    }),
    telegram: z.object({
        connected: z.boolean(),
        botUsername: z.string().optional(),
        deepLink: z.string().optional(),
    }),
}).openapi("ChannelStatus");

// ══════════════════════════════════════════════════════════════
// PAYMENTS
// ══════════════════════════════════════════════════════════════

export const PaymentResponse = z.object({
    id: z.string().uuid(),
    clientId: z.string().uuid(),
    clientName: z.string().optional(),
    stripeSessionId: z.string().nullable(),
    amount: z.number().int(),
    currency: z.string(),
    status: PaymentStatusEnum,
    paymentMethod: PaymentMethodEnum,
    confirmedBy: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
}).openapi("Payment");

export const CheckoutResponse = z.object({
    url: z.string().url(),
}).openapi("CheckoutResponse");

export const ReceiptResponse = z.object({
    receiptUrl: z.string().optional(),
    html: z.string().optional(),
}).openapi("ReceiptResponse");

export const BankTransferConfirmResponse = z.object({
    success: z.boolean(),
    payment: PaymentResponse,
}).openapi("BankTransferConfirmResponse");

// ══════════════════════════════════════════════════════════════
// SUBSCRIPTIONS
// ══════════════════════════════════════════════════════════════

export const TierLimitsSchema = z.object({
    maxClients: z.number().int(),
    maxChannels: z.number().int(),
    maxBots: z.number().int(),
    analytics: z.boolean(),
    paymentCollection: z.boolean(),
    checkinSequences: z.boolean(),
    whiteLabel: z.boolean(),
}).openapi("TierLimits");

export const TierInfoSchema = z.object({
    tier: SubscriptionTierEnum,
    limits: TierLimitsSchema,
    pricing: z.object({
        monthly: z.number().int(),
        annual: z.number().int(),
    }),
    currency: z.string(),
}).openapi("TierInfo");

export const TierListResponse = z.object({
    tiers: z.array(TierInfoSchema),
}).openapi("TierListResponse");

export const SubscriptionStatusResponse = z.object({
    subscribed: z.boolean(),
    tier: SubscriptionTierEnum.optional(),
    status: SubscriptionStatusEnum.optional(),
    billingInterval: BillingIntervalEnum.optional(),
    currentPeriodEnd: z.string().datetime().optional(),
    cancelAtPeriodEnd: z.boolean().optional(),
    trialEnd: z.string().datetime().nullable().optional(),
    limits: TierLimitsSchema.optional(),
    usage: z.object({
        clients: z.number().int(),
        plans: z.number().int(),
        mealPlans: z.number().int(),
        offers: z.number().int(),
    }),
    isTrialing: z.boolean().optional(),
    trialDaysLeft: z.number().int().optional(),
}).openapi("SubscriptionStatusResponse");

export const InvoiceSchema = z.object({
    id: z.string(),
    amount: z.number().int(),
    currency: z.string(),
    status: z.string(),
    created: z.number().int(),
    hostedUrl: z.string().nullable(),
    pdfUrl: z.string().nullable(),
}).openapi("Invoice");

export const InvoiceListResponse = z.object({
    invoices: z.array(InvoiceSchema),
}).openapi("InvoiceListResponse");

export const SubscriptionChangeResponse = z.object({
    message: z.string(),
    effectiveDate: z.string().datetime().optional(),
}).openapi("SubscriptionChangeResponse");

// ══════════════════════════════════════════════════════════════
// MESSAGES
// ══════════════════════════════════════════════════════════════

export const ConversationResponse = z.object({
    clientId: z.string().uuid(),
    clientName: z.string(),
    clientStatus: ClientStatusEnum,
    preferredChannel: MessageChannelEnum,
    conversationPinned: z.boolean(),
    conversationArchived: z.boolean(),
    messages: z.array(MessageSchema),
    unreadCount: z.number().int().optional(),
    latestMessage: MessageSchema.optional(),
}).openapi("Conversation");

export const WindowStatusResponse = z.object({
    channel: MessageChannelEnum,
    windowOpen: z.boolean(),
    windowExpiresAt: z.string().datetime().nullable(),
    canSendFreeText: z.boolean(),
    canSendMarketingTemplate: z.boolean(),
}).openapi("WindowStatus");

// ══════════════════════════════════════════════════════════════
// LEADS
// ══════════════════════════════════════════════════════════════

export const LeadResponse = z.object({
    id: z.string().uuid(),
    coachId: z.string().uuid(),
    offerId: z.string().uuid().nullable(),
    name: z.string(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    telegramChatId: z.string().nullable(),
    channelTag: MessageChannelEnum,
    source: z.string().nullable(),
    intakeData: z.any().nullable(),
    intakeToken: z.string().nullable(),
    status: LeadStatusEnum,
    offer: z.object({
        id: z.string().uuid(),
        name: z.string(),
        slug: z.string(),
    }).nullable().optional(),
    unreadCount: z.number().int().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
}).openapi("Lead");

// ══════════════════════════════════════════════════════════════
// OFFERS
// ══════════════════════════════════════════════════════════════

export const OfferResponse = z.object({
    id: z.string().uuid(),
    coachId: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    channelParam: MessageChannelEnum.nullable(),
    sourceTags: z.array(z.string()),
    ctaType: z.string().nullable(),
    paymentRoute: z.string().nullable(),
    isActive: z.boolean(),
    _count: z.object({ leads: z.number().int() }).optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
}).openapi("Offer");

// ══════════════════════════════════════════════════════════════
// RISK SCORING
// ══════════════════════════════════════════════════════════════

export const RiskScoreResponse = z.object({
    score: z.number().int().min(0).max(100),
    level: RiskLevelEnum,
    summary: z.string(),
    suggestion: z.string().nullable(),
    factors: z.object({
        compliance: z.number().optional(),
        engagement: z.number().optional(),
        activity: z.number().optional(),
        behavioral: z.number().optional(),
        payment: z.number().optional(),
    }),
    updatedAt: z.string().datetime(),
}).openapi("RiskScore");

// ══════════════════════════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════════════════════════

export const AnalyticsSummaryResponse = z.object({
    totalClients: z.number().int(),
    activePlans: z.number().int(),
    totalWorkouts: z.number().int(),
    averageCompliance: z.number(),
    revenue: z.number(),
    atRiskClients: z.number().int(),
    channels: z.object({
        whatsapp: z.number().int(),
        telegram: z.number().int(),
    }),
    newLeads: z.number().int(),
}).openapi("AnalyticsSummary");

export const EventLogSchema = z.object({
    id: z.string().uuid(),
    coachId: z.string().uuid().nullable(),
    clientId: z.string().uuid().nullable(),
    clientName: z.string().optional(),
    eventType: z.string(),
    channel: MessageChannelEnum.nullable(),
    metadata: z.any().nullable(),
    createdAt: z.string().datetime(),
}).openapi("EventLog");

// ══════════════════════════════════════════════════════════════
// ADMIN
// ══════════════════════════════════════════════════════════════

export const AdminOverviewResponse = z.object({
    totalCoaches: z.number().int(),
    totalClients: z.number().int(),
    activeSubscriptions: z.number().int(),
    mrr: z.number(),
    revenue30d: z.number(),
    tierBreakdown: z.record(z.number().int()),
    recentCoaches: z.array(z.object({
        id: z.string().uuid(),
        email: z.string(),
        name: z.string().nullable(),
        tier: SubscriptionTierEnum.optional(),
        createdAt: z.string().datetime(),
    })),
    recentEvents: z.array(EventLogSchema),
}).openapi("AdminOverview");

export const AdminCoachSchema = z.object({
    id: z.string().uuid(),
    email: z.string(),
    name: z.string().nullable(),
    slug: z.string().nullable(),
    businessName: z.string().nullable(),
    onboardingCompleted: z.boolean(),
    createdAt: z.string().datetime(),
    subscription: z.object({
        tier: SubscriptionTierEnum,
        status: SubscriptionStatusEnum,
        billingInterval: BillingIntervalEnum,
    }).nullable(),
    _count: z.object({
        clients: z.number().int(),
    }),
    revenue: z.number().optional(),
}).openapi("AdminCoach");

export const AdminCoachListResponse = z.object({
    coaches: z.array(AdminCoachSchema),
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
}).openapi("AdminCoachList");

export const AdminRevenueResponse = z.object({
    mrr: z.number(),
    mrrByTier: z.record(z.number()),
    monthlyRevenue: z.array(z.object({
        month: z.string(),
        amount: z.number(),
    })),
    paymentVolume: z.number(),
    churn: z.number(),
    recentChanges: z.array(EventLogSchema),
}).openapi("AdminRevenue");

// ══════════════════════════════════════════════════════════════
// SHORT LINKS
// ══════════════════════════════════════════════════════════════

export const ShortLinkResponse = z.object({
    id: z.string().uuid(),
    coachId: z.string().uuid(),
    code: z.string(),
    targetUrl: z.string(),
    label: z.string().nullable(),
    clicks: z.number().int(),
    shortUrl: z.string(),
    createdAt: z.string().datetime(),
}).openapi("ShortLink");

// ══════════════════════════════════════════════════════════════
// PUBLIC PROFILES
// ══════════════════════════════════════════════════════════════

export const PublicProfileResponse = z.object({
    coach: z.object({
        name: z.string().nullable(),
        businessName: z.string().nullable(),
        bio: z.string().nullable(),
        avatarUrl: z.string().nullable(),
        specialities: z.array(z.string()),
        slug: z.string().nullable(),
    }),
    rates: z.object({
        pricePerSession: z.number().int().nullable(),
        sessionsPerBlock: z.number().int().nullable(),
        monthlyRate: z.number().int().nullable(),
        showRates: z.boolean(),
    }),
    channels: z.object({
        whatsapp: z.object({ available: z.boolean(), link: z.string().optional() }),
        telegram: z.object({ available: z.boolean(), link: z.string().optional() }),
    }),
    offers: z.array(z.object({
        id: z.string().uuid(),
        name: z.string(),
        slug: z.string(),
    })),
}).openapi("PublicProfile");

export const OfferLandingResponse = z.object({
    coach: z.object({
        name: z.string().nullable(),
        businessName: z.string().nullable(),
        slug: z.string().nullable(),
        avatarUrl: z.string().nullable(),
    }),
    offer: OfferResponse,
    channel: z.string().nullable(),
    source: z.string().nullable(),
}).openapi("OfferLanding");

export const LeadApplyResponse = z.object({
    success: z.boolean(),
    leadId: z.string().uuid(),
    message: z.string(),
}).openapi("LeadApplyResponse");

// ══════════════════════════════════════════════════════════════
// NUTRITION
// ══════════════════════════════════════════════════════════════

export const NutritionIngredientResponse = z.object({
    id: z.number().int(),
    name: z.string(),
    calories: z.number().optional(),
    protein: z.number().optional(),
    carbs: z.number().optional(),
    fat: z.number().optional(),
}).openapi("NutritionIngredient");

export const NutritionRecipeResponse = z.object({
    id: z.number().int(),
    title: z.string(),
    image: z.string().optional(),
    readyInMinutes: z.number().int().optional(),
    servings: z.number().int().optional(),
    calories: z.number().optional(),
    protein: z.number().optional(),
    carbs: z.number().optional(),
    fat: z.number().optional(),
}).openapi("NutritionRecipe");

// ══════════════════════════════════════════════════════════════
// FLOWS
// ══════════════════════════════════════════════════════════════

export const FlowResponse = z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    categories: z.array(z.string()).optional(),
}).openapi("Flow");

export const FlowSendResponse = z.object({
    success: z.boolean(),
    messageId: z.string().optional(),
}).openapi("FlowSendResponse");

// ══════════════════════════════════════════════════════════════
// META TEMPLATES
// ══════════════════════════════════════════════════════════════

export const MetaTemplateSchema = z.object({
    name: z.string(),
    status: z.string(),
    category: z.string(),
    language: z.string(),
    id: z.string(),
}).openapi("MetaTemplate");

export const MetaTemplateListResponse = z.object({
    count: z.number().int(),
    templates: z.array(MetaTemplateSchema),
}).openapi("MetaTemplateList");

// ══════════════════════════════════════════════════════════════
// INTAKE
// ══════════════════════════════════════════════════════════════

export const IntakeSubmitResponse = z.object({
    success: z.boolean(),
    message: z.string(),
}).openapi("IntakeSubmitResponse");

export const IntakeInfoResponse = z.object({
    name: z.string(),
}).openapi("IntakeInfoResponse");

// ══════════════════════════════════════════════════════════════
// WEBHOOKS
// ══════════════════════════════════════════════════════════════

export const WebhookReceivedResponse = z.object({
    received: z.literal(true),
}).openapi("WebhookReceivedResponse");
