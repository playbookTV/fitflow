import {
    DeliveryChannel,
    SendResult,
    CheckInPrompt,
    WorkoutPayload,
    OnboardingPayload,
} from "@fitflow/shared";
import { sendTelegramMessage, sendTelegramInlineKeyboard } from "../telegram";

/**
 * Telegram adapter implementing the DeliveryChannel interface.
 * Uses per-coach Telegram bots to deliver messages.
 */
export class TelegramAdapter implements DeliveryChannel {
    constructor(private botToken: string) {}

    async sendMessage(recipientId: string, content: string, clientId?: string): Promise<SendResult> {
        try {
            const result = await sendTelegramMessage(this.botToken, recipientId, content);
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

    async sendStructuredCheckIn(recipientId: string, data: CheckInPrompt): Promise<SendResult> {
        const text = `📊 *Weekly Check\\-in*\n\nHey ${escapeMarkdown(data.clientName)}\\! Time for your weekly check\\-in\\.`;
        const buttons = [
            [
                { text: "⚡ Energy: Low", callback_data: `checkin_energy_1_${data.clientId}` },
                { text: "⚡ Energy: Medium", callback_data: `checkin_energy_3_${data.clientId}` },
                { text: "⚡ Energy: High", callback_data: `checkin_energy_5_${data.clientId}` },
            ],
            [
                { text: "✅ Start Check-in", callback_data: `checkin_start_${data.clientId}` },
            ],
        ];

        try {
            const result = await sendTelegramInlineKeyboard(this.botToken, recipientId, text, buttons);
            return { success: true, messageId: String(result.message_id) };
        } catch (error: any) {
            return { success: false, error: error.message || "Failed to send Telegram check-in" };
        }
    }

    async sendWorkout(recipientId: string, data: WorkoutPayload): Promise<SendResult> {
        const text = `🏋️‍♂️ *Workout Time\\!*\n\nPlan: *${escapeMarkdown(data.planTitle)}*\nDay: ${data.dayNumber}\n\nCheck your dashboard: ${escapeMarkdown(data.dashboardUrl)}`;
        const buttons = [
            [
                { text: "✅ Mark as DONE", callback_data: `workout_done_${data.clientId}` },
                { text: "⏭ Skip", callback_data: `workout_skip_${data.clientId}` },
            ],
        ];

        try {
            const result = await sendTelegramInlineKeyboard(this.botToken, recipientId, text, buttons);
            return { success: true, messageId: String(result.message_id) };
        } catch (error: any) {
            return { success: false, error: error.message || "Failed to send Telegram workout" };
        }
    }

    async sendOnboarding(recipientId: string, data: OnboardingPayload): Promise<SendResult> {
        const text = `👋 *Welcome to FitFlow\\!*\n\nHey ${escapeMarkdown(data.clientName)}\\! To get started, fill out your intake form:\n\n${escapeMarkdown(data.intakeFormUrl)}\n\nOnce done, your coach will assign your first plan\\! 🚀`;

        try {
            const result = await sendTelegramMessage(this.botToken, recipientId, text, "MarkdownV2");
            return { success: true, messageId: String(result.message_id) };
        } catch (error: any) {
            return { success: false, error: error.message || "Failed to send Telegram onboarding" };
        }
    }
}

/** Escape special characters for Telegram MarkdownV2 */
function escapeMarkdown(text: string): string {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}
