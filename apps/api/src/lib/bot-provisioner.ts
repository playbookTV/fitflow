import crypto from "node:crypto";
import { prisma } from "./prisma";
import { getTelegramBotInfo, setTelegramWebhook } from "./telegram";
import { logEvent, EventType } from "./event-logger";

/**
 * Generate a Telegram-compatible webhook secret token.
 * Must only contain characters from [A-Za-z0-9_-] and be ≤ 256 chars.
 */
function generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString("hex"); // 64 hex chars, all [0-9a-f]
}

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

    // Generate a secret token for webhook verification.
    // This is registered with Telegram and validated on every incoming update
    // via the X-Telegram-Bot-Api-Secret-Token header.
    const webhookSecret = generateWebhookSecret();

    // Set the webhook on Telegram's side (registers the secret token)
    await setTelegramWebhook(botToken, webhookUrl, webhookSecret);

    // Upsert into BotRegistry (handles re-provisioning)
    await prisma.botRegistry.upsert({
        where: { coachId },
        update: {
            botToken,
            botUsername,
            webhookUrl,
            webhookSecret,
            provisionedAt: new Date(),
        },
        create: {
            coachId,
            botToken,
            botUsername,
            webhookUrl,
            webhookSecret,
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
 * Auto-provision the default coach's bot on startup if env vars are set
 * and no bot_registry entry exists yet (e.g. after a DB reset).
 */
export async function ensureDefaultBot(): Promise<void> {
    const coachId = process.env.DEFAULT_COACH_ID;
    const botToken = process.env.DEFAULT_TG_BOT_TOKEN;
    if (!coachId || !botToken) return;

    const existing = await prisma.botRegistry.findUnique({ where: { coachId } });
    if (existing) return;

    // Verify the coach exists before attempting to provision (FK constraint)
    const coach = await prisma.coach.findUnique({ where: { id: coachId } });
    if (!coach) {
        console.warn(`[BotProvisioner] Coach ${coachId} not found — skipping auto-provision. Coach must sign up first.`);
        return;
    }

    try {
        const result = await provisionBot(coachId, botToken);
        console.log(`[BotProvisioner] Auto-provisioned @${result.botUsername} for default coach`);
    } catch (error) {
        console.error("[BotProvisioner] Auto-provision failed:", error);
    }
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
