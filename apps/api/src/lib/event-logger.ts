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

    // Check-in
    CHECKIN_SENT: "checkin.sent",
    CHECKIN_COMPLETED: "checkin.completed",

    // Channel
    CHANNEL_ASSIGNED: "channel.assigned",
    BOT_PROVISIONED: "bot.provisioned",

    // Onboarding
    ONBOARDING_SENT: "onboarding.sent",
    INTAKE_COMPLETED: "intake.completed",
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
