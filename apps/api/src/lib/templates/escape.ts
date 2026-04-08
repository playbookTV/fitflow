/**
 * Escape special characters for Telegram MarkdownV2.
 * Extracted from telegram-adapter.ts for use across all template render functions.
 */
export function escapeMarkdownV2(text: string): string {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}
