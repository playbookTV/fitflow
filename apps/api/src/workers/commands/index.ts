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
    if (normalizedBody === "HELP" || normalizedBody === "MENU") {
        return helpCommand(channel);
    }

    if (normalizedBody === "PROGRESS" || normalizedBody === "STATUS") {
        return progressCommand(clientId);
    }

    if (normalizedBody.startsWith("WEIGHT ")) {
        const rawValue = normalizedBody.slice(7).trim();
        return weightCommand(clientId, coachId, rawValue);
    }

    if (normalizedBody.startsWith("RPE ")) {
        const rawValue = normalizedBody.slice(4).trim();
        return rpeCommand(clientId, rawValue);
    }

    return null;
}
