import { handleExerciseCommand } from "./exerciseCommandHandler";
import { setPending, getPending, clearPending } from "../services/pendingExercise";
import { sendWithRetry } from "../services/exerciseDelivery";
import { logEvent, EventType } from "../lib/event-logger";
import { prisma } from "../lib/prisma";

/**
 * Routes coach commands received via messaging channels (WhatsApp/Telegram).
 * Returns a text response to send back to the coach, or null if not a recognised command.
 */
export async function routeCoachCommand(
    coachId: string,
    input: string
): Promise<string | null> {
    const trimmed = input.trim();

    // Handle confirmation keywords
    if (/^(yes|send|confirm|ok|go)$/i.test(trimmed)) {
        const pending = await getPending(coachId);
        if (!pending) return "Nothing pending to send.";

        let sent = 0;
        let failed = 0;

        for (const clientId of pending.clientIds) {
            try {
                await sendWithRetry({
                    exerciseId: pending.exerciseId,
                    sets: pending.sets,
                    reps: pending.reps,
                    intensity: pending.intensity,
                    clientId,
                    coachId,
                });
                sent++;
                await logEvent(EventType.EXERCISE_VIDEO_SENT, {
                    coachId,
                    clientId,
                    metadata: { exerciseId: pending.exerciseId },
                });
            } catch (err) {
                failed++;
                console.error(`[CoachRouter] Failed for client ${clientId}:`, err);
            }
        }

        await clearPending(coachId);
        return failed > 0
            ? `Sent to ${sent} client(s), ${failed} failed.`
            : `Sent to ${sent} client(s) \u2713`;
    }

    // Handle cancel
    if (/^(cancel|no|nevermind)$/i.test(trimmed)) {
        await clearPending(coachId);
        return "Exercise send cancelled.";
    }

    // Handle exercise commands
    if (/^\/(?:exercise|ex|send|workout)\b/i.test(trimmed)) {
        // Default to all active clients
        const activeClients = await prisma.client.findMany({
            where: { coachId, status: "ACTIVE" },
            select: { id: true },
        });
        const clientIds = activeClients.map((c) => c.id);

        const result = await handleExerciseCommand(coachId, trimmed);

        if (result.type === "error") {
            return result.message;
        }

        if (result.type === "confirm") {
            await setPending(coachId, {
                exerciseId: result.exercise.id,
                clientIds,
                sets: result.parsed.sets,
                reps: result.parsed.reps,
                intensity: result.parsed.intensity,
                expiresAt: Date.now() + 600_000,
            });
            const setsReps =
                result.parsed.sets && result.parsed.reps
                    ? ` ${result.parsed.sets}\u00D7${result.parsed.reps}`
                    : "";
            return `Found: *${result.exercise.title}*${setsReps}. Send to ${clientIds.length} client(s)? Reply "yes" to send.`;
        }

        if (result.type === "picker") {
            const list = result.exercises
                .map((ex, i) => `${i + 1}. ${ex.title}`)
                .join("\n");
            const prefix = result.fallback
                ? "No exact match. Closest:"
                : "Multiple results:";
            return `${prefix}\n${list}\n\nReply with the number to select.`;
        }
    }

    // Handle picker number selection
    const numMatch = trimmed.match(/^(\d+)$/);
    if (numMatch) {
        // This would require storing the picker results — for now handled via dashboard.
        // In messaging, the coach can re-send with more specific terms.
        return null;
    }

    return null; // Not a recognised command
}
