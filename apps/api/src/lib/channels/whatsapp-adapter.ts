import {
    DeliveryChannel,
    SendResult,
    CheckInPrompt,
    WorkoutPayload,
    OnboardingPayload,
} from "@fitflow/shared";
import { sendWhatsAppMessage } from "../meta";

/**
 * WhatsApp adapter implementing the DeliveryChannel interface.
 * Wraps existing Meta Cloud API functions behind the channel abstraction.
 */
export class WhatsAppAdapter implements DeliveryChannel {
    async sendMessage(recipientId: string, content: string, clientId?: string): Promise<SendResult> {
        try {
            const result = await sendWhatsAppMessage(recipientId, content, clientId);
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

    async sendStructuredCheckIn(recipientId: string, data: CheckInPrompt): Promise<SendResult> {
        const message = `📊 *Weekly Check-in*\n\nHey ${data.clientName}! It's time for your weekly check-in. Tracking your progress is key to results.\n\nPlease reply with:\n1. Your current weight\n2. Energy level (1-5)\n3. Sleep quality\n4. Any notes for your coach`;
        return this.sendMessage(recipientId, message, data.clientId);
    }

    async sendWorkout(recipientId: string, data: WorkoutPayload): Promise<SendResult> {
        const message = `🏋️‍♂️ *Workout Time!*\n\nPlan: *${data.planTitle}*\nDay: ${data.dayNumber}\n\nCheck your dashboard for today's exercises: ${data.dashboardUrl}\n\nReply *DONE* when you're finished! 🔥`;
        return this.sendMessage(recipientId, message, data.clientId);
    }

    async sendOnboarding(recipientId: string, data: OnboardingPayload): Promise<SendResult> {
        const message = `👋 *Welcome to FitFlow!*\n\nHey ${data.clientName}! To get started, I need to collect some info about your goals and fitness level.\n\nClick here to fill your intake form: ${data.intakeFormUrl}\n\nOnce done, your coach will assign your first plan! 🚀`;
        return this.sendMessage(recipientId, message, data.clientId);
    }
}
