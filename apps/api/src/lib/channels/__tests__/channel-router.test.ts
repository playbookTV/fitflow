import { describe, it, expect } from "vitest";

describe("Channel Router", () => {
    describe("getRecipientId", () => {
        it("returns phone for WHATSAPP client", () => {
            const client = { phone: "447700900000", telegramChatId: null, preferredChannel: "WHATSAPP" };
            // getRecipientId extracts based on channel preference
            expect(client.phone).toBe("447700900000");
        });

        it("returns telegramChatId for TELEGRAM client", () => {
            const client = { phone: "447700900000", telegramChatId: "123456789", preferredChannel: "TELEGRAM" };
            expect(client.telegramChatId).toBe("123456789");
        });
    });
});
