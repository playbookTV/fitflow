import { MessageChannel } from "@prisma/client";
import { DeliveryChannel } from "@fitflow/shared";
import { WhatsAppAdapter } from "./whatsapp-adapter";
import { TelegramAdapter } from "./telegram-adapter";
import { prisma } from "../prisma";

// Singleton WhatsApp adapter (all coaches share the same WA Business API)
const whatsAppAdapter = new WhatsAppAdapter();

/**
 * Resolves the correct DeliveryChannel adapter based on channel type.
 *
 * For WhatsApp: returns a singleton adapter (shared WA Business API credentials).
 * For Telegram: looks up the coach's bot token from BotRegistry and creates an adapter.
 */
export async function getChannel(channel: MessageChannel, coachId: string): Promise<DeliveryChannel> {
    if (channel === MessageChannel.WHATSAPP) {
        return whatsAppAdapter;
    }

    if (channel === MessageChannel.TELEGRAM) {
        const botRegistry = await prisma.botRegistry.findUnique({
            where: { coachId },
        });

        if (!botRegistry) {
            throw new Error(`No Telegram bot provisioned for coach ${coachId}`);
        }

        return new TelegramAdapter(botRegistry.botToken);
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
