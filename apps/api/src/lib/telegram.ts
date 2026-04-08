import axios from "axios";

const TELEGRAM_API = "https://api.telegram.org";

interface TelegramMessageResult {
    message_id: number;
    chat: { id: number };
    date: number;
}

interface InlineKeyboardButton {
    text: string;
    callback_data?: string;
    url?: string;
}

/**
 * Send a plain text message via Telegram Bot API.
 */
export async function sendTelegramMessage(
    botToken: string,
    chatId: string,
    text: string,
    parseMode: "MarkdownV2" | "HTML" | undefined = undefined
): Promise<TelegramMessageResult> {
    const url = `${TELEGRAM_API}/bot${botToken}/sendMessage`;

    const data: any = { chat_id: chatId, text };
    if (parseMode) data.parse_mode = parseMode;

    try {
        const response = await axios.post(url, data);
        if (!response.data.ok) {
            throw new Error(response.data.description || "Telegram API error");
        }
        return response.data.result;
    } catch (error: any) {
        console.error("[Telegram API Error] sendMessage:", error.response?.data || error.message);
        throw error;
    }
}

/**
 * Send a message with inline keyboard buttons.
 */
export async function sendTelegramInlineKeyboard(
    botToken: string,
    chatId: string,
    text: string,
    buttons: InlineKeyboardButton[][],
    parseMode: "MarkdownV2" | "HTML" | undefined = "MarkdownV2"
): Promise<TelegramMessageResult> {
    const url = `${TELEGRAM_API}/bot${botToken}/sendMessage`;

    const data: any = {
        chat_id: chatId,
        text,
        reply_markup: {
            inline_keyboard: buttons,
        },
    };
    if (parseMode) data.parse_mode = parseMode;

    try {
        const response = await axios.post(url, data);
        if (!response.data.ok) {
            throw new Error(response.data.description || "Telegram API error");
        }
        return response.data.result;
    } catch (error: any) {
        console.error("[Telegram API Error] sendInlineKeyboard:", error.response?.data || error.message);
        throw error;
    }
}

/**
 * Send a video via Telegram Bot API.
 */
export async function sendTelegramVideo(
    botToken: string,
    chatId: string,
    videoUrl: string,
    caption: string,
    parseMode: "MarkdownV2" | "HTML" | "Markdown" | undefined = "Markdown"
): Promise<TelegramMessageResult> {
    const url = `${TELEGRAM_API}/bot${botToken}/sendVideo`;

    const data: any = {
        chat_id: chatId,
        video: videoUrl,
        caption,
    };
    if (parseMode) data.parse_mode = parseMode;

    try {
        const response = await axios.post(url, data);
        if (!response.data.ok) {
            throw new Error(response.data.description || "Telegram API error");
        }
        return response.data.result;
    } catch (error: any) {
        console.error("[Telegram API Error] sendVideo:", error.response?.data || error.message);
        throw error;
    }
}

/**
 * Answer a callback query (acknowledges button press to remove loading state).
 */
export async function answerCallbackQuery(
    botToken: string,
    callbackQueryId: string,
    text?: string
): Promise<void> {
    const url = `${TELEGRAM_API}/bot${botToken}/answerCallbackQuery`;

    try {
        await axios.post(url, {
            callback_query_id: callbackQueryId,
            text,
        });
    } catch (error: any) {
        console.error("[Telegram API Error] answerCallbackQuery:", error.response?.data || error.message);
    }
}

/**
 * Set webhook URL for a Telegram bot.
 */
export async function setTelegramWebhook(
    botToken: string,
    webhookUrl: string
): Promise<void> {
    const url = `${TELEGRAM_API}/bot${botToken}/setWebhook`;

    try {
        const response = await axios.post(url, { url: webhookUrl });
        if (!response.data.ok) {
            throw new Error(response.data.description || "Failed to set webhook");
        }
        console.log(`[Telegram] Webhook set: ${webhookUrl}`);
    } catch (error: any) {
        console.error("[Telegram API Error] setWebhook:", error.response?.data || error.message);
        throw error;
    }
}

/**
 * Delete webhook for a Telegram bot.
 */
export async function deleteTelegramWebhook(botToken: string): Promise<void> {
    const url = `${TELEGRAM_API}/bot${botToken}/deleteWebhook`;

    try {
        await axios.post(url);
        console.log("[Telegram] Webhook deleted");
    } catch (error: any) {
        console.error("[Telegram API Error] deleteWebhook:", error.response?.data || error.message);
        throw error;
    }
}

/**
 * Get bot info (verify token validity and retrieve username).
 */
export async function getTelegramBotInfo(
    botToken: string
): Promise<{ id: number; username: string; first_name: string }> {
    const url = `${TELEGRAM_API}/bot${botToken}/getMe`;

    try {
        const response = await axios.get(url);
        if (!response.data.ok) {
            throw new Error(response.data.description || "Failed to get bot info");
        }
        return response.data.result;
    } catch (error: any) {
        console.error("[Telegram API Error] getMe:", error.response?.data || error.message);
        throw error;
    }
}
