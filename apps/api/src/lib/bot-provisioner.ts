import crypto from "node:crypto";
import { setTelegramWebhook, getTelegramBotInfo } from "./telegram";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";

/** Cached bot username after first startup check */
let sharedBotUsername: string | null = null;

/**
 * Generate a Telegram-compatible webhook secret token.
 * Must only contain characters from [A-Za-z0-9_-] and be <= 256 chars.
 */
function generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString("hex"); // 64 hex chars
}

/**
 * Ensure the shared Telegram bot's webhook is registered on startup.
 *
 * Uses env vars:
 *   DEFAULT_TG_BOT_TOKEN — the shared bot token (required)
 *   TG_WEBHOOK_SECRET    — persisted secret for verifying incoming updates (auto-generated if missing)
 *
 * Registers a single webhook URL: POST /telegram/webhook
 */
export async function ensureSharedBot(): Promise<void> {
    const botToken = process.env.DEFAULT_TG_BOT_TOKEN;
    if (!botToken) {
        console.log("[BotProvisioner] No DEFAULT_TG_BOT_TOKEN — Telegram disabled");
        return;
    }

    try {
        const botInfo = await getTelegramBotInfo(botToken);
        sharedBotUsername = botInfo.username;

        const webhookUrl = `${API_BASE_URL}/telegram/webhook`;
        const webhookSecret = process.env.TG_WEBHOOK_SECRET || generateWebhookSecret();

        await setTelegramWebhook(botToken, webhookUrl, webhookSecret);

        // Store the secret in env for this process (used by webhook handler)
        process.env.TG_WEBHOOK_SECRET = webhookSecret;

        console.log(`[BotProvisioner] Shared bot @${sharedBotUsername} webhook registered`);
    } catch (error) {
        console.error("[BotProvisioner] Failed to register shared bot:", error);
    }
}

/**
 * Get the shared bot's token from environment.
 */
export function getSharedBotToken(): string | null {
    return process.env.DEFAULT_TG_BOT_TOKEN || null;
}

/**
 * Get the shared bot's username (available after ensureSharedBot() runs).
 */
export function getSharedBotUsername(): string | null {
    return sharedBotUsername;
}
