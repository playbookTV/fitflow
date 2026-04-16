import { MessageChannel } from "@prisma/client";
import { DeliveryChannel } from "@fitflow/shared";
import { WhatsAppAdapter } from "./whatsapp-adapter";
import { TelegramAdapter } from "./telegram-adapter";
import { prisma } from "../prisma";
import { getSharedBotToken } from "../bot-provisioner";

/**
 * Resolves the correct DeliveryChannel adapter based on channel type.
 *
 * For WhatsApp: creates a per-call adapter with coach branding.
 * For Telegram: uses the shared bot token with coach-branded messaging.
 */
export async function getChannel(channel: MessageChannel, coachId: string): Promise<DeliveryChannel> {
    if (channel === MessageChannel.WHATSAPP) {
        const coach = await prisma.coach.findUnique({
            where: { id: coachId },
            select: { name: true },
        });
        return new WhatsAppAdapter(coach?.name ?? undefined);
    }

    if (channel === MessageChannel.TELEGRAM) {
        const botToken = getSharedBotToken();
        if (!botToken) {
            throw new Error("Telegram bot not configured (missing DEFAULT_TG_BOT_TOKEN)");
        }

        const coach = await prisma.coach.findUnique({
            where: { id: coachId },
            select: { name: true },
        });

        return new TelegramAdapter(botToken, coach?.name ?? undefined);
    }

    throw new Error(`Unsupported channel: ${channel}`);
}

/**
 * Get the recipient identifier for a client based on their preferred channel.
 * For WhatsApp: phone number
 * For Telegram: telegramChatId
 */
export function getRecipientId(client: { phone: string | null; telegramChatId: string | null; preferredChannel: MessageChannel }): string {
    if (client.preferredChannel === MessageChannel.WHATSAPP) {
        if (!client.phone) throw new Error("Client has no phone number for WhatsApp delivery");
        return client.phone;
    }

    if (client.preferredChannel === MessageChannel.TELEGRAM) {
        if (!client.telegramChatId) throw new Error("Client has no Telegram chat ID");
        return client.telegramChatId;
    }

    throw new Error(`Unsupported channel: ${client.preferredChannel}`);
}
