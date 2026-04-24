/**
 * Escape special characters for Telegram MarkdownV2.
 * Extracted from telegram-adapter.ts for use across all template render functions.
 */
export function escapeMarkdownV2(text: string): string {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

/**
 * Escape a URL for use inside the (...) part of a MarkdownV2 inline link.
 * Per the Telegram Bot API docs, only ')' and '\' need escaping inside link URLs.
 */
export function escapeMarkdownV2Url(url: string): string {
    return url.replace(/([)\\])/g, "\\$1");
}
