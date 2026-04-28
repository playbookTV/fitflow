import { prisma } from "../../lib/prisma";
import { logEvent, EventType } from "../../lib/event-logger";

const WEIGHT_REGEX = /^([\d.]+)\s*(kg|lbs?)?$/i;
const MIN_WEIGHT = 20;
const MAX_WEIGHT = 300;

export async function weightCommand(clientId: string, coachId: string, rawValue: string): Promise<string> {
    const match = rawValue.match(WEIGHT_REGEX);
    if (!match) {
        return "Invalid format. Try: WEIGHT 82.5";
    }

    const weight = parseFloat(match[1]);
    if (!Number.isFinite(weight) || weight < MIN_WEIGHT || weight > MAX_WEIGHT) {
        return `Weight must be between ${MIN_WEIGHT} and ${MAX_WEIGHT}. Try: WEIGHT 82.5`;
    }

    const unit = match[2]?.toLowerCase();
    const weightKg = unit === "lbs" || unit === "lb" ? Math.round(weight * 0.453592 * 10) / 10 : weight;

    await prisma.checkIn.create({
        data: { clientId, weight: weightKg },
    });

    await logEvent(EventType.WEIGHT_LOGGED, {
        coachId,
        clientId,
        metadata: { weight: weightKg, rawInput: rawValue },
    });

    const display = unit === "lbs" || unit === "lb"
        ? `${weight} lbs (${weightKg} kg)`
        : `${weightKg} kg`;

    return `Weight logged: ${display}`;
}
