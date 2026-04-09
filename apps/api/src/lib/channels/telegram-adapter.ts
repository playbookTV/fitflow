import {
    DeliveryChannel,
    SendResult,
    CheckInPrompt,
    WorkoutPayload,
    OnboardingPayload,
    VideoPayload,
    TemplateId,
} from "@fitflow/shared";
import { sendTelegramMessage, sendTelegramInlineKeyboard, sendTelegramVideo } from "../telegram";
import { renderTemplate } from "../templates";
import { escapeMarkdownV2 } from "../templates/escape";

/**
 * Telegram adapter implementing the DeliveryChannel interface.
 * Uses a shared bot token with optional per-coach branding.
 */
export class TelegramAdapter implements DeliveryChannel {
    constructor(
        private botToken: string,
        private coachName?: string,
    ) {}

    /**
     * Prepend coach name as a header to message text.
     * Handles MarkdownV2 escaping when parseMode requires it.
     */
    private brandText(text: string, parseMode?: string): string {
        if (!this.coachName) return text;

        if (parseMode === "MarkdownV2") {
            return `*${escapeMarkdownV2(this.coachName)}*\n\n${text}`;
        }
        return `${this.coachName}\n\n${text}`;
    }

    async sendMessage(recipientId: string, content: string, clientId?: string): Promise<SendResult> {
        try {
            const result = await sendTelegramMessage(this.botToken, recipientId, this.brandText(content));
            return {
                success: true,
                messageId: String(result.message_id),
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || "Failed to send Telegram message",
            };
        }
    }

    async sendTemplate(recipientId: string, templateId: TemplateId, context: Record<string, any>, clientId?: string): Promise<SendResult> {
        try {
            const rendered = renderTemplate(templateId, "telegram", context);
            const brandedText = this.brandText(rendered.text, rendered.parseMode);

            let result;
            if (rendered.buttons && rendered.buttons.length > 0) {
                result = await sendTelegramInlineKeyboard(
                    this.botToken,
                    recipientId,
                    brandedText,
                    rendered.buttons,
                    rendered.parseMode
                );
            } else {
                result = await sendTelegramMessage(
                    this.botToken,
                    recipientId,
                    brandedText,
                    rendered.parseMode
                );
            }

            return { success: true, messageId: String(result.message_id) };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || `Failed to send Telegram template ${templateId}`,
            };
        }
    }

    async sendStructuredCheckIn(recipientId: string, data: CheckInPrompt): Promise<SendResult> {
        const text = `\u{1F4CA} *Weekly Check\\-in*\n\nHey ${escapeMarkdownV2(data.clientName)}\\! Time for your weekly check\\-in\\.`;
        const buttons = [
            [
                { text: "\u{26A1} Energy: Low", callback_data: `checkin_energy_1_${data.clientId}` },
                { text: "\u{26A1} Energy: Medium", callback_data: `checkin_energy_3_${data.clientId}` },
                { text: "\u{26A1} Energy: High", callback_data: `checkin_energy_5_${data.clientId}` },
            ],
            [
                { text: "\u{2705} Start Check-in", callback_data: `checkin_start_${data.clientId}` },
            ],
        ];

        try {
            const result = await sendTelegramInlineKeyboard(
                this.botToken, recipientId, this.brandText(text, "MarkdownV2"), buttons
            );
            return { success: true, messageId: String(result.message_id) };
        } catch (error: any) {
            return { success: false, error: error.message || "Failed to send Telegram check-in" };
        }
    }

    async sendWorkout(recipientId: string, data: WorkoutPayload): Promise<SendResult> {
        const text = `\u{1F3CB}\u{FE0F}\u{200D}\u{2642}\u{FE0F} *Workout Time\\!*\n\nPlan: *${escapeMarkdownV2(data.planTitle)}*\nDay: ${data.dayNumber}\n\nCheck your dashboard: ${escapeMarkdownV2(data.dashboardUrl)}`;
        const buttons = [
            [
                { text: "\u{2705} Mark as DONE", callback_data: `workout_done_${data.clientId}` },
                { text: "\u{23ED} Skip", callback_data: `workout_skip_${data.clientId}` },
            ],
        ];

        try {
            const result = await sendTelegramInlineKeyboard(
                this.botToken, recipientId, this.brandText(text, "MarkdownV2"), buttons
            );
            return { success: true, messageId: String(result.message_id) };
        } catch (error: any) {
            return { success: false, error: error.message || "Failed to send Telegram workout" };
        }
    }

    async sendOnboarding(recipientId: string, data: OnboardingPayload): Promise<SendResult> {
        const text = `\u{1F44B} *Welcome to FitFlow\\!*\n\nHey ${escapeMarkdownV2(data.clientName)}\\! To get started, fill out your intake form:\n\n${escapeMarkdownV2(data.intakeFormUrl)}\n\nOnce done, your coach will assign your first plan\\! \u{1F680}`;

        try {
            const result = await sendTelegramMessage(
                this.botToken, recipientId, this.brandText(text, "MarkdownV2"), "MarkdownV2"
            );
            return { success: true, messageId: String(result.message_id) };
        } catch (error: any) {
            return { success: false, error: error.message || "Failed to send Telegram onboarding" };
        }
    }

    async sendVideo(recipientId: string, data: VideoPayload): Promise<SendResult> {
        try {
            const caption = this.coachName
                ? `${this.coachName}\n\n${data.caption}`
                : data.caption;

            const result = await sendTelegramVideo(
                this.botToken,
                recipientId,
                data.videoUrl,
                caption,
                "Markdown"
            );
            return { success: true, messageId: String(result.message_id) };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || "Failed to send Telegram video",
            };
        }
    }
}
