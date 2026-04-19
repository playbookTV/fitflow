/**
 * Message template system types.
 * Templates are type-safe TypeScript render functions, not regex-interpolated strings.
 */

export enum TemplateId {
    // Lead & Intake
    LEAD_ENQUIRY_RESPONSE = "lead.enquiry_response",
    LEAD_PAYMENT_REQUEST = "lead.payment_request",
    LEAD_PAYMENT_CONFIRMED = "lead.payment_confirmed",

    // Onboarding
    ONBOARDING_WELCOME = "onboarding.welcome",
    ONBOARDING_COMPLETE = "onboarding.complete",

    // Workout Delivery
    WORKOUT_DAILY = "workout.daily",
    WORKOUT_REST_DAY = "workout.rest_day",
    WORKOUT_WEEK_SUMMARY = "workout.week_summary",
    WORKOUT_LOGGED_CONFIRMATION = "workout.logged_confirmation",

    // Check-ins
    CHECKIN_WEEKLY_PROMPT = "checkin.weekly_prompt",
    CHECKIN_COACH_ACK = "checkin.coach_ack",
    CHECKIN_MISSED_NUDGE = "checkin.missed_nudge",

    // At-Risk & Re-engagement
    ATRISK_MISSED_WORKOUT = "atrisk.missed_workout",
    ATRISK_THREE_PLUS = "atrisk.three_plus",
    ATRISK_LAPSED = "atrisk.lapsed",

    // Milestones
    MILESTONE_HALFWAY = "milestone.halfway",
    MILESTONE_COMPLETION = "milestone.completion",

    // Payments
    PAYMENT_REMINDER = "payment.reminder",

    // Renewals
    RENEWAL_7DAY = "renewal.7day",
    RENEWAL_2DAY = "renewal.2day",
    RENEWAL_POST_EXPIRY = "renewal.post_expiry",

    // Meal Delivery
    MEAL_DAILY = "meal.daily",
    MEAL_REST_DAY = "meal.rest_day",
    MEAL_LOGGED_CONFIRMATION = "meal.logged_confirmation",
    MEAL_MISSED_NUDGE = "meal.missed_nudge",

    // Exercise Videos
    EXERCISE_VIDEO = "exercise.video",

    // System & Admin
    SYSTEM_BANK_DETAILS = "system.bank_details",
    SYSTEM_BANK_CONFIRMED = "system.bank_confirmed",
    SYSTEM_BROADCAST = "system.broadcast",
}

export type ChannelType = "telegram" | "whatsapp";

export interface InlineButton {
    text: string;
    callback_data?: string;
    url?: string;
}

export interface TemplateRenderResult {
    text: string;
    buttons?: InlineButton[][];
    parseMode?: "MarkdownV2" | "HTML";
}

export interface ChannelTemplate<TContext extends Record<string, any> = Record<string, any>> {
    render: (ctx: TContext) => TemplateRenderResult;
}

export interface TemplateDefinition<TContext extends Record<string, any> = Record<string, any>> {
    id: TemplateId;
    description: string;
    channels: {
        telegram: ChannelTemplate<TContext>;
        whatsapp: ChannelTemplate<TContext>;
    };
}

// --- Context interfaces per template group ---

export interface LeadEnquiryContext {
    client_first_name: string;
    coach_first_name: string;
    offer_name: string;
    intake_link: string;
}

export interface LeadPaymentRequestContext {
    client_first_name: string;
    coach_first_name: string;
    offer_name: string;
    payment_link: string;
}

export interface LeadPaymentConfirmedContext {
    client_first_name: string;
    coach_first_name: string;
    offer_name: string;
    programme_start_date: string;
}

export interface OnboardingWelcomeContext {
    client_first_name: string;
    offer_name: string;
    clientId: string;
}

export interface OnboardingCompleteContext {
    client_first_name: string;
    coach_first_name: string;
    programme_start_date: string;
    next_checkin_day: string;
}

export interface WorkoutDailyContext {
    workout_day_number: number;
    workout_name: string;
    exercise_list: string;
    clientId: string;
}

export interface WorkoutRestDayContext {
    client_first_name: string;
    coach_first_name: string;
}

export interface WorkoutWeekSummaryContext {
    programme_week: number;
    total_weeks: number;
    weekly_summary: string;
    coach_first_name: string;
}

export interface WorkoutLoggedConfirmationContext {
    client_first_name: string;
    workout_day_number: number;
    compliance: number;
}

export interface CheckinWeeklyPromptContext {
    client_first_name: string;
    programme_week: number;
    total_weeks: number;
    clientId: string;
}

export interface CheckinCoachAckContext {
    client_first_name: string;
    coach_first_name: string;
}

export interface CheckinMissedNudgeContext {
    client_first_name: string;
    programme_week: number;
    checkin_link: string;
    clientId: string;
}

export interface AtRiskMissedWorkoutContext {
    client_first_name: string;
    coach_first_name: string;
}

export interface AtRiskThreePlusContext {
    client_first_name: string;
    coach_first_name: string;
}

export interface AtRiskLapsedContext {
    client_first_name: string;
    coach_first_name: string;
}

export interface MilestoneHalfwayContext {
    client_first_name: string;
    coach_first_name: string;
    programme_week: number;
    total_weeks: number;
}

export interface MilestoneCompletionContext {
    client_first_name: string;
    coach_first_name: string;
    offer_name: string;
    total_weeks: number;
}

export interface PaymentReminderContext {
    client_first_name: string;
    coach_first_name: string;
    amount: string;
    payment_link: string;
}

export interface Renewal7DayContext {
    client_first_name: string;
    coach_first_name: string;
    renewal_date: string;
    payment_link: string;
    renewal_amount: string;
}

export interface Renewal2DayContext {
    client_first_name: string;
    coach_first_name: string;
    renewal_date: string;
    payment_link: string;
}

export interface RenewalPostExpiryContext {
    client_first_name: string;
    coach_first_name: string;
    renewal_date: string;
    payment_link: string;
}

export interface SystemBankDetailsContext {
    client_first_name: string;
    coach_first_name: string;
    offer_name: string;
    bank_transfer_details: string;
}

export interface SystemBankConfirmedContext {
    client_first_name: string;
    coach_first_name: string;
}

export interface SystemBroadcastContext {
    client_first_name: string;
    coach_first_name: string;
    broadcast_message: string;
}

export interface MealDailyContext {
    client_first_name: string;
    day_number: number;
    day_title: string;
    plan_title: string;
    meals_list: string;
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
    total_prep_time: string;
    compliance: number;
}

export interface MealRestDayContext {
    client_first_name: string;
    coach_first_name: string;
}

export interface MealLoggedConfirmationContext {
    day_number: number;
    client_first_name: string;
    compliance: number;
}

export interface MealMissedNudgeContext {
    client_first_name: string;
    day_number: number;
    plan_title: string;
}

export interface ExerciseVideoContext {
    exercise_name: string;
    muscle_group: string;
    sets: number | null;
    reps: string | null;
    instructions: string | null;
}
