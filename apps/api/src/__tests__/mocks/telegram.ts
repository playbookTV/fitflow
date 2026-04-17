import { vi } from "vitest";

vi.mock("../../lib/telegram", () => ({
    sendTelegramMessage: vi.fn().mockResolvedValue({ message_id: 1, chat: { id: 123 }, date: Date.now() }),
    sendTelegramInlineKeyboard: vi.fn().mockResolvedValue({ message_id: 2, chat: { id: 123 }, date: Date.now() }),
    sendTelegramVideo: vi.fn().mockResolvedValue({ message_id: 3, chat: { id: 123 }, date: Date.now() }),
    answerCallbackQuery: vi.fn().mockResolvedValue(true),
    setTelegramWebhook: vi.fn().mockResolvedValue(true),
    deleteTelegramWebhook: vi.fn().mockResolvedValue(undefined),
    getTelegramBotInfo: vi.fn().mockResolvedValue({ id: 123, is_bot: true, first_name: "TestBot", username: "testbot" }),
}));

vi.mock("../../lib/bot-provisioner", () => ({
    ensureSharedBot: vi.fn().mockResolvedValue(undefined),
    getSharedBotToken: vi.fn().mockReturnValue("test-bot-token"),
    getSharedBotUsername: vi.fn().mockReturnValue("testbot"),
}));
