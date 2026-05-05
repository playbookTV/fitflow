import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { handleExerciseCommand } from "../handlers/exerciseCommandHandler";
import {
    setPending,
    getPending,
    clearPending,
} from "../services/pendingExercise";
import { sendWithRetry } from "../services/exerciseDelivery";
import { logEvent, EventType } from "../lib/event-logger";

const router: Router = Router();

/**
 * Resolve the target client list for a coach-initiated exercise send.
 * If the caller supplies clientIds, intersect them with the coach's roster —
 * never trust the body to scope the recipient set across tenants.
 * If no clientIds are supplied, default to all of the coach's ACTIVE clients.
 */
async function resolveTargetClientIds(coachId: string, requested?: unknown): Promise<string[]> {
    if (Array.isArray(requested) && requested.length > 0) {
        const ids = requested.filter((v): v is string => typeof v === "string");
        if (ids.length === 0) return [];
        const owned = await prisma.client.findMany({
            where: { coachId, id: { in: ids } },
            select: { id: true },
        });
        return owned.map((c) => c.id);
    }
    const active = await prisma.client.findMany({
        where: { coachId, status: "ACTIVE" },
        select: { id: true },
    });
    return active.map((c) => c.id);
}

/**
 * POST /coach-exercises/command
 * Parse an exercise command and return search results.
 * Body: { input: string, clientIds?: string[] }
 */
router.post(
    "/command",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        const coachId = req.user?.id as string;
        if (!coachId) return res.status(401).json({ error: "Unauthorized" });

        const { input, clientIds } = req.body;
        if (!input) return res.status(400).json({ error: "input is required" });

        try {
            const targetClientIds = await resolveTargetClientIds(coachId, clientIds);

            const result = await handleExerciseCommand(coachId, input);

            if (result.type === "error") {
                return res.json(result);
            }

            if (result.type === "confirm") {
                await setPending(coachId, {
                    exerciseId: result.exercise.id,
                    clientIds: targetClientIds,
                    sets: result.parsed.sets,
                    reps: result.parsed.reps,
                    intensity: result.parsed.intensity,
                    expiresAt: Date.now() + 600_000,
                });
                return res.json({
                    ...result,
                    clientCount: targetClientIds.length,
                    message: `Found: *${result.exercise.title}*. Send ${result.parsed.sets}\u00D7${result.parsed.reps} to ${targetClientIds.length} client(s)? Use /confirm to send.`,
                });
            }

            // type === "picker"
            return res.json({
                ...result,
                clientIds: targetClientIds,
            });
        } catch (error) {
            console.error("[POST /coach-exercises/command]", error);
            res.status(500).json({ error: "Failed to process exercise command" });
        }
    }
);

/**
 * POST /coach-exercises/select
 * Coach picks an exercise from the picker results.
 * Body: { exerciseId: string, clientIds: string[], sets?: number, reps?: number, intensity?: string }
 */
router.post(
    "/select",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        const coachId = req.user?.id as string;
        if (!coachId) return res.status(401).json({ error: "Unauthorized" });

        const { exerciseId, clientIds, sets, reps, intensity } = req.body;
        if (!exerciseId)
            return res.status(400).json({ error: "exerciseId is required" });

        try {
            const targetClientIds = await resolveTargetClientIds(coachId, clientIds);

            await setPending(coachId, {
                exerciseId,
                clientIds: targetClientIds,
                sets: sets ?? null,
                reps: reps ?? null,
                intensity: intensity ?? null,
                expiresAt: Date.now() + 600_000,
            });

            res.json({
                type: "pending",
                exerciseId,
                clientCount: targetClientIds.length,
                message: `Exercise selected. Send to ${targetClientIds.length} client(s)? Use /confirm to send.`,
            });
        } catch (error) {
            console.error("[POST /coach-exercises/select]", error);
            res.status(500).json({ error: "Failed to select exercise" });
        }
    }
);

/**
 * POST /coach-exercises/confirm
 * Send the pending exercise to all targeted clients.
 */
router.post(
    "/confirm",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        const coachId = req.user?.id as string;
        if (!coachId) return res.status(401).json({ error: "Unauthorized" });

        try {
            const pending = await getPending(coachId);
            if (!pending) {
                return res.json({
                    type: "error",
                    message: "Nothing pending to send. Use /exercise first.",
                });
            }

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
                    console.error(
                        `[coach-exercises/confirm] Failed for client ${clientId}:`,
                        err
                    );

                    await logEvent(EventType.EXERCISE_VIDEO_FAILED, {
                        coachId,
                        clientId,
                        metadata: {
                            exerciseId: pending.exerciseId,
                            error: String(err),
                        },
                    });
                }
            }

            await clearPending(coachId);

            res.json({
                type: "sent",
                sent,
                failed,
                message:
                    failed > 0
                        ? `Sent to ${sent} client(s), ${failed} failed.`
                        : `Sent to ${sent} client(s) \u2713`,
            });
        } catch (error) {
            console.error("[POST /coach-exercises/confirm]", error);
            res.status(500).json({ error: "Failed to send exercises" });
        }
    }
);

/**
 * POST /coach-exercises/cancel
 * Clear the pending exercise state.
 */
router.post(
    "/cancel",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        const coachId = req.user?.id as string;
        if (!coachId) return res.status(401).json({ error: "Unauthorized" });

        await clearPending(coachId);
        res.json({ type: "cancelled", message: "Exercise send cancelled." });
    }
);

export default router;
