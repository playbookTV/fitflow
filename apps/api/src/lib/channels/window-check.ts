import { MessageDirection } from "@prisma/client";
import { prisma } from "../prisma";

const WINDOW_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Checks whether the WhatsApp 24-hour customer service window is open for a client.
 *
 * The window is open if the client sent an inbound message within the last 24 hours.
 * When the window is closed, only MARKETING-category templates can be sent.
 */
export async function isWindowOpen(clientId: string): Promise<boolean> {
    const lastInbound = await prisma.message.findFirst({
        where: {
            clientId,
            direction: MessageDirection.INBOUND,
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
    });

    if (!lastInbound) return false;

    return Date.now() - lastInbound.createdAt.getTime() < WINDOW_DURATION_MS;
}
