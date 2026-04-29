import { MessageChannel } from "@prisma/client";
import { helpCommand } from "./help";
import { progressCommand } from "./progress";
import { weightCommand } from "./weight";
import { rpeCommand } from "./rpe";

/**
 * Route an incoming text message to a command handler.
 * Returns the response text to send back, or null if the message is not a command.
 */
export async function handleCommand(
    normalizedBody: string,
    clientId: string,
    coachId: string,
    channel: MessageChannel,
): Promise<string | null> {
    // Strip leading "/" so /help, /progress etc. work alongside bare commands
    const body = normalizedBody.startsWith("/") ? normalizedBody.slice(1) : normalizedBody;

    if (body === "HELP" || body === "MENU") {
        return helpCommand(channel);
    }

    if (body === "PROGRESS" || body === "STATUS") {
        return progressCommand(clientId);
    }

    if (body.startsWith("WEIGHT ")) {
        const rawValue = body.slice(7).trim();
        return weightCommand(clientId, coachId, rawValue);
    }

    if (body.startsWith("RPE ")) {
        const rawValue = body.slice(4).trim();
        return rpeCommand(clientId, rawValue);
    }

    return null;
}
