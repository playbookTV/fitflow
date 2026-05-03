import {
    DeliveryChannel,
    SendResult,
    CheckInPrompt,
    WorkoutPayload,
    OnboardingPayload,
    VideoPayload,
    TemplateId,
} from "@fitflow/shared";
import { sendWhatsAppMessage, sendWhatsAppVideo, MetaApiError, MetaErrorCode } from "../meta";
import { buildSendPayload, getTemplateCategory } from "../templates/meta-templates";
import { isWindowOpen } from "./window-check";

/** Meta error codes that will never succeed on retry. */
const NON_RETRYABLE_CODES = new Set<number>([
    MetaErrorCode.TEMPLATE_NOT_FOUND,
    MetaErrorCode.RECIPIENT_NOT_ON_WHATSAPP,
    MetaErrorCode.REENGAGEMENT_MESSAGE,
    MetaErrorCode.TEMPLATE_PARAM_FORMAT,
]);

/**
 * WhatsApp adapter implementing the DeliveryChannel interface.
 * Wraps existing Meta Cloud API functions behind the channel abstraction.
 */
export class WhatsAppAdapter implements DeliveryChannel {
    constructor(private coachName?: string) {}

    private brandText(text: string): string {
        if (!this.coachName) return text;
        return `*${this.coachName}*\n\n${text}`;
    }

    async sendMessage(recipientId: string, content: string, clientId?: string): Promise<SendResult> {
        // Free-form text messages require an open 24-hour window.
        // Check proactively to give callers a clear signal before hitting Meta.
        if (clientId) {
            const windowOpen = await isWindowOpen(clientId);
            if (!windowOpen) {
                console.warn(`[WhatsApp] 24h window closed for client ${clientId} — free-form message blocked`);
                return {
                    success: false,
                    error: "24-hour customer service window is closed. Use an approved template instead.",
                };
            }
        }

        try {
            const result = await sendWhatsAppMessage(recipientId, this.brandText(content), clientId);
            return {
                success: true,
                messageId: result.messages?.[0]?.id,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || "Failed to send WhatsApp message",
            };
        }
    }

    async sendTemplate(recipientId: string, templateId: TemplateId, context: Record<string, any>, clientId?: string): Promise<SendResult> {
        try {
            const templatePayload = buildSendPayload(templateId, context);
            const result = await sendWhatsAppMessage(recipientId, templatePayload, clientId);
            return {
                success: true,
                messageId: result.messages?.[0]?.id,
            };
        } catch (error: any) {
            const metaError = error instanceof MetaApiError ? error : null;

            const isNonRetryable = metaError ? NON_RETRYABLE_CODES.has(metaError.code) : false;

            if (metaError?.isWindowClosed) {
                const category = getTemplateCategory(templateId);
                return {
                    success: false,
                    error: `Meta rejected template ${templateId} (${category}) with a window-closed error.`,
                    retryable: false,
                };
            }

            return {
                success: false,
                error: error.message || `Failed to send WhatsApp template ${templateId}`,
                retryable: !isNonRetryable,
            };
        }
    }

    async sendStructuredCheckIn(recipientId: string, data: CheckInPrompt): Promise<SendResult> {
        const message = `\u{1F4CA} *Weekly Check-in*\n\nHey ${data.clientName}! It's time for your weekly check-in. Tracking your progress is key to results.\n\nPlease reply with:\n1. Your current weight\n2. Energy level (1-5)\n3. Sleep quality\n4. Any notes for your coach`;
        return this.sendMessage(recipientId, message, data.clientId);
    }

    async sendWorkout(recipientId: string, data: WorkoutPayload): Promise<SendResult> {
        const message = `\u{1F3CB}\u{FE0F}\u{200D}\u{2642}\u{FE0F} *Workout Time!*\n\nPlan: *${data.planTitle}*\nDay: ${data.dayNumber}\n\nCheck your dashboard for today's exercises: ${data.dashboardUrl}\n\nReply *DONE* when you're finished! \u{1F525}`;
        return this.sendMessage(recipientId, message, data.clientId);
    }

    async sendOnboarding(recipientId: string, data: OnboardingPayload): Promise<SendResult> {
        const message = `\u{1F44B} *Welcome to FitFlow!*\n\nHey ${data.clientName}! To get started, I need to collect some info about your goals and fitness level.\n\nClick here to fill your intake form: ${data.intakeFormUrl}\n\nOnce done, your coach will assign your first plan! \u{1F680}`;
        return this.sendMessage(recipientId, message, data.clientId);
    }

    async sendVideo(recipientId: string, data: VideoPayload): Promise<SendResult> {
        try {
            const result = await sendWhatsAppVideo(
                recipientId,
                data.videoUrl,
                data.caption,
                data.clientId
            );
            return {
                success: true,
                messageId: result.messages?.[0]?.id,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || "Failed to send WhatsApp video",
            };
        }
    }
}
