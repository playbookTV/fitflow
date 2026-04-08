/**
 * Channel abstraction types for FitFlow.
 * These types define the interface that all delivery channel adapters must implement.
 */

import { TemplateId } from "../templates/types";

export enum Channel {
    WHATSAPP = "WHATSAPP",
    TELEGRAM = "TELEGRAM",
}

export interface SendResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

export interface CheckInPrompt {
    clientId: string;
    clientName: string;
}

export interface WorkoutPayload {
    clientId: string;
    clientName: string;
    planTitle: string;
    dayNumber: number;
    dashboardUrl: string;
}

export interface OnboardingPayload {
    clientId: string;
    clientName: string;
    intakeFormUrl: string;
}

/**
 * DeliveryChannel interface — the core abstraction.
 * WhatsApp and Telegram adapters both implement this interface.
 * Business logic (schedulers, workers) calls these methods without knowing the channel.
 */
export interface VideoPayload {
    videoUrl: string;
    caption: string;
    thumbnailUrl?: string;
    clientId?: string;
}

export interface DeliveryChannel {
    /** Send a plain text message */
    sendMessage(recipientId: string, content: string, clientId?: string): Promise<SendResult>;

    /** Send a structured check-in prompt (WhatsApp Flow or Telegram inline keyboard) */
    sendStructuredCheckIn(recipientId: string, data: CheckInPrompt): Promise<SendResult>;

    /** Send a workout delivery message */
    sendWorkout(recipientId: string, data: WorkoutPayload): Promise<SendResult>;

    /** Send an onboarding message */
    sendOnboarding(recipientId: string, data: OnboardingPayload): Promise<SendResult>;

    /** Send a message using the centralized template system */
    sendTemplate(recipientId: string, templateId: TemplateId, context: Record<string, any>, clientId?: string): Promise<SendResult>;

    /** Send a video message (exercise demos, etc.) */
    sendVideo?(recipientId: string, data: VideoPayload): Promise<SendResult>;
}
