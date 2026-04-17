import { MessageChannel } from "@prisma/client";
import { prisma } from "./prisma";

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

    // Plan & Workout
    PLAN_ASSIGNED: "plan.assigned",
    WORKOUT_DELIVERED: "workout.delivered",
    WORKOUT_COMPLETED: "workout.completed",

    // Meal Plan
    MEAL_PLAN_ASSIGNED: "meal_plan.assigned",
    MEAL_DELIVERED: "meal.delivered",
    MEAL_COMPLETED: "meal.completed",

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
} as const;

export type EventTypeValue = typeof EventType[keyof typeof EventType];

interface LogEventParams {
    coachId?: string;
    clientId?: string;
    channel?: MessageChannel;
    metadata?: Record<string, any>;
}

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
}
