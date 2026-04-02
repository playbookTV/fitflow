import { prisma } from "./prisma";
import { getTelegramBotInfo, setTelegramWebhook } from "./telegram";
import { logEvent, EventType } from "./event-logger";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";

/**
 * Provision a Telegram bot for a coach.
 *
 * The coach provides a bot token (created via BotFather).
 * FitFlow validates the token, retrieves bot info, sets the webhook,
 * and stores everything in the BotRegistry.
 *
 * In a future iteration, FitFlow can manage a pre-provisioned pool
 * of bots and assign them automatically.
 */
export async function provisionBot(
    coachId: string,
    botToken: string
): Promise<{ botUsername: string; webhookUrl: string }> {
    // Validate the token and get bot info
    const botInfo = await getTelegramBotInfo(botToken);
    const botUsername = botInfo.username;

    // Build the per-coach webhook URL
    const webhookUrl = `${API_BASE_URL}/telegram/webhook/${coachId}`;

    // Set the webhook on Telegram's side
    await setTelegramWebhook(botToken, webhookUrl);

    // Upsert into BotRegistry (handles re-provisioning)
    await prisma.botRegistry.upsert({
        where: { coachId },
        update: {
            botToken,
            botUsername,
            webhookUrl,
            provisionedAt: new Date(),
        },
        create: {
            coachId,
            botToken,
            botUsername,
            webhookUrl,
        },
    });

    await logEvent(EventType.BOT_PROVISIONED, {
        coachId,
        metadata: { botUsername, webhookUrl },
    });

    console.log(`[BotProvisioner] Bot @${botUsername} provisioned for coach ${coachId}`);

    return { botUsername, webhookUrl };
}

/**
 * Remove a coach's Telegram bot provisioning.
 */
export async function deprovisionBot(coachId: string): Promise<void> {
    const registry = await prisma.botRegistry.findUnique({ where: { coachId } });
    if (!registry) return;

    const { deleteTelegramWebhook } = await import("./telegram");
    await deleteTelegramWebhook(registry.botToken);

    await prisma.botRegistry.delete({ where: { coachId } });
    console.log(`[BotProvisioner] Bot deprovisioned for coach ${coachId}`);
}
