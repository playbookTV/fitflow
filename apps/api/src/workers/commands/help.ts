import { MessageChannel } from "@prisma/client";

const COMMANDS = [
    ["DONE", "Log today's workout as completed"],
    ["SKIP", "Log today's workout as skipped"],
    ["PROGRESS", "See your current plan status"],
    ["WEIGHT 82.5", "Log your weight"],
    ["RPE 7", "Rate your last workout (1-10)"],
    ["HELP", "Show this menu"],
] as const;

export function helpCommand(channel: MessageChannel): string {
    if (channel === MessageChannel.TELEGRAM) {
        const lines = COMMANDS.map(([cmd, desc]) => `\`${cmd}\` — ${desc}`);
        return `*FITFLOW COMMANDS*\n\n${lines.join("\n")}`;
    }

    // WhatsApp: plain text (no markdown support in free-form messages)
    const lines = COMMANDS.map(([cmd, desc]) => `${cmd} — ${desc}`);
    return `FITFLOW COMMANDS\n\n${lines.join("\n")}`;
}
