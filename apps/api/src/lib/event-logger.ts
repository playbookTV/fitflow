import { MessageChannel } from "@prisma/client";
import { prisma } from "./prisma";
import posthog from "./posthog";

/**
 * Event type constants for the EventLog model.
 * Using string constants (not an enum) for extensibility without migrations.
 */
export const EventType = {
    // Lead lifecycle
    LEAD_CREATED: "lead.created",
    LEAD_INTAKE_COMPLETE: "lead.intake_complete",
    LEAD_CONVERTED: "lead.converted",

    // Client lifecycle
    CLIENT_CREATED: "client.created",
    CLIENT_ACTIVATED: "client.activated",
    CLIENT_PAUSED: "client.paused",
    CLIENT_INACTIVE: "client.inactive",

    // Payment
    PAYMENT_CREATED: "payment.created",
    PAYMENT_CONFIRMED: "payment.confirmed",
    PAYMENT_FAILED: "payment.failed",
    BANK_TRANSFER_CONFIRMED: "payment.bank_transfer_confirmed",
    BANK_TRANSFER_SENT: "payment.bank_transfer_sent",

    // Plan & Workout
    PLAN_ASSIGNED: "plan.assigned",
    TEMPLATE_USED: "template.used",
    WORKOUT_DELIVERED: "workout.delivered",
    WORKOUT_COMPLETED: "workout.completed",
    WORKOUT_DAY_EMPTY: "workout.day_empty",

    // Meal Plan
    MEAL_PLAN_ASSIGNED: "meal_plan.assigned",
    MEAL_TEMPLATE_USED: "meal_plan.template_used",
    MEAL_DELIVERED: "meal.delivered",
    MEAL_COMPLETED: "meal.completed",
    MEAL_DAY_EMPTY: "meal.day_empty",

    // Check-in
    CHECKIN_SENT: "checkin.sent",
    CHECKIN_COMPLETED: "checkin.completed",

    // Channel
    CHANNEL_ASSIGNED: "channel.assigned",
    BOT_PROVISIONED: "bot.provisioned",

    // Onboarding
    ONBOARDING_SENT: "onboarding.sent",
    INTAKE_COMPLETED: "intake.completed",

    // Engagement & retention
    MISSED_WORKOUT_FOLLOWUP_SENT: "engagement.missed_workout_sent",
    ATRISK_ALERT_SENT: "engagement.atrisk_sent",
    REENGAGEMENT_SENT: "engagement.reengagement_sent",
    MISSED_CHECKIN_NUDGE_SENT: "engagement.missed_checkin_sent",
    MILESTONE_SENT: "engagement.milestone_sent",
    WEEK_SUMMARY_SENT: "engagement.week_summary_sent",
    PAYMENT_REMINDER_SENT: "payment.reminder_sent",
    RENEWAL_REMINDER_SENT: "renewal.reminder_sent",
    PAYMENT_CONFIRMED_SENT: "payment.confirmed_sent",

    // Exercise videos
    EXERCISE_VIDEO_SENT: "exercise.video_sent",
    EXERCISE_VIDEO_FAILED: "exercise.video_failed",
    EXERCISE_COMMAND_PARSED: "exercise.command_parsed",

    // Coach onboarding
    COACH_ONBOARDING_STEP_COMPLETED: "coach_onboarding.step_completed",
    COACH_ONBOARDING_STEP_SKIPPED: "coach_onboarding.step_skipped",
    COACH_ONBOARDING_COMPLETED: "coach_onboarding.completed",
    TRAINER_ACTIVATED: "trainer.activated",

    // Profile (ftfw.fit)
    PROFILE_VIEWED: "profile.viewed",
    PROFILE_CHANNEL_CLICK: "profile.channel_click",
    PROFILE_REDIRECT: "profile.redirect",
    PROFILE_LINK_COPIED: "profile.link_copied",

    // Coach subscription
    SUBSCRIPTION_CREATED: "subscription.created",
    SUBSCRIPTION_UPGRADED: "subscription.upgraded",
    SUBSCRIPTION_DOWNGRADED: "subscription.downgraded",
    SUBSCRIPTION_CANCELED: "subscription.canceled",
    SUBSCRIPTION_RENEWED: "subscription.renewed",
    SUBSCRIPTION_PAYMENT_FAILED: "subscription.payment_failed",
    SUBSCRIPTION_TRIAL_ENDING: "subscription.trial_ending",

    // Message delivery
    MESSAGE_DELIVERED: "message.delivered",
    MESSAGE_READ: "message.read",
    MESSAGE_FAILED: "message.failed",
    MESSAGE_WINDOW_CLOSED: "message.window_closed",

    // Text commands
    COMMAND_HANDLED: "message.command_handled",
    WEIGHT_LOGGED: "checkin.weight_logged",

    // AI features
    AI_PLAN_GENERATED: "ai.plan_generated",
    AI_MEAL_PLAN_GENERATED: "ai.meal_plan_generated",
    RISK_SCORE_COMPUTED: "risk.score_computed",
} as const;

export type EventTypeValue = typeof EventType[keyof typeof EventType];

interface LogEventParams {
    coachId?: string;
    clientId?: string;
    channel?: MessageChannel;
    metadata?: Record<string, any>;
}

// Events forwarded to PostHog for product analytics (coachId is required as distinctId)
const POSTHOG_TRACKED_EVENTS = new Set<EventTypeValue>([
    EventType.CLIENT_CREATED,
    EventType.CLIENT_ACTIVATED,
    EventType.CLIENT_PAUSED,
    EventType.CLIENT_INACTIVE,
    EventType.PAYMENT_CONFIRMED,
    EventType.BANK_TRANSFER_CONFIRMED,
    EventType.PLAN_ASSIGNED,
    EventType.WORKOUT_COMPLETED,
    EventType.CHECKIN_COMPLETED,
    EventType.AI_PLAN_GENERATED,
    EventType.AI_MEAL_PLAN_GENERATED,
    EventType.MEAL_PLAN_ASSIGNED,
    EventType.SUBSCRIPTION_CREATED,
    EventType.SUBSCRIPTION_UPGRADED,
    EventType.SUBSCRIPTION_DOWNGRADED,
    EventType.SUBSCRIPTION_CANCELED,
    EventType.SUBSCRIPTION_RENEWED,
    EventType.COACH_ONBOARDING_COMPLETED,
    EventType.TRAINER_ACTIVATED,
    EventType.INTAKE_COMPLETED,
]);

// Maps internal dot-notation event types to PostHog "[object] [verb]" names
const POSTHOG_EVENT_NAMES: Partial<Record<EventTypeValue, string>> = {
    [EventType.CLIENT_CREATED]: "client created",
    [EventType.CLIENT_ACTIVATED]: "client activated",
    [EventType.CLIENT_PAUSED]: "client paused",
    [EventType.CLIENT_INACTIVE]: "client deactivated",
    [EventType.PAYMENT_CONFIRMED]: "payment confirmed",
    [EventType.BANK_TRANSFER_CONFIRMED]: "bank transfer confirmed",
    [EventType.PLAN_ASSIGNED]: "plan assigned",
    [EventType.WORKOUT_COMPLETED]: "workout completed",
    [EventType.CHECKIN_COMPLETED]: "checkin completed",
    [EventType.AI_PLAN_GENERATED]: "ai plan generated",
    [EventType.AI_MEAL_PLAN_GENERATED]: "ai meal plan generated",
    [EventType.MEAL_PLAN_ASSIGNED]: "meal plan assigned",
    [EventType.SUBSCRIPTION_CREATED]: "subscription created",
    [EventType.SUBSCRIPTION_UPGRADED]: "subscription upgraded",
    [EventType.SUBSCRIPTION_DOWNGRADED]: "subscription downgraded",
    [EventType.SUBSCRIPTION_CANCELED]: "subscription canceled",
    [EventType.SUBSCRIPTION_RENEWED]: "subscription renewed",
    [EventType.COACH_ONBOARDING_COMPLETED]: "coach onboarding completed",
    [EventType.TRAINER_ACTIVATED]: "trainer activated",
    [EventType.INTAKE_COMPLETED]: "intake completed",
};

/**
 * Log a structured event to the EventLog table.
 * Fire-and-forget: errors are logged but don't throw.
 */
export async function logEvent(
    eventType: EventTypeValue,
    params: LogEventParams = {}
): Promise<void> {
    try {
        await prisma.eventLog.create({
            data: {
                eventType,
                coachId: params.coachId,
                clientId: params.clientId,
                channel: params.channel,
                metadata: params.metadata ?? undefined,
            },
        });
    } catch (error) {
        console.error(`[EventLogger] Failed to log event ${eventType}:`, error);
    }

    if (params.coachId && POSTHOG_TRACKED_EVENTS.has(eventType)) {
        const phEventName = POSTHOG_EVENT_NAMES[eventType] ?? eventType;
        posthog.capture({
            distinctId: params.coachId,
            event: phEventName,
            properties: {
                ...(params.clientId && { client_id: params.clientId }),
                ...(params.channel && { channel: params.channel }),
                ...(params.metadata && params.metadata),
            },
        });
    }
}
