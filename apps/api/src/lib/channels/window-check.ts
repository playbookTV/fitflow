import { MessageDirection } from "@prisma/client";
import { prisma } from "../prisma";

const WINDOW_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface WindowStatus {
    isOpen: boolean;
    expiresAt: Date | null;
    lastInboundAt: Date | null;
}

/**
 * Checks whether the WhatsApp 24-hour customer service window is open for a client.
 *
 * The window is open if the client sent an inbound message within the last 24 hours.
 * Only free-form session messages require the window to be open; approved templates
 * (UTILITY, MARKETING, AUTHENTICATION) can be sent regardless of window status.
 */
export async function isWindowOpen(clientId: string): Promise<boolean> {
    const status = await getWindowStatus(clientId);
    return status.isOpen;
}

/**
 * Returns the full window status including expiry time for UI display.
 */
export async function getWindowStatus(clientId: string): Promise<WindowStatus> {
    // clientId is internal (sourced from authenticated routes / webhook resolution),
    // so the query is tenant-bounded by the FK even though the guard can't see coachId.
    const lastInbound = await prisma.message.findFirst({
        where: {
            clientId,
            direction: MessageDirection.INBOUND,
            __unsafeGlobal: true,
        } as never,
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
    });

    if (!lastInbound) {
        return { isOpen: false, expiresAt: null, lastInboundAt: null };
    }

    const lastInboundAt = lastInbound.createdAt;
    const expiresAt = new Date(lastInboundAt.getTime() + WINDOW_DURATION_MS);
    const isOpen = Date.now() < expiresAt.getTime();

    return {
        isOpen,
        expiresAt: isOpen ? expiresAt : null,
        lastInboundAt,
    };
}
