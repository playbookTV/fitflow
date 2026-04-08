import { redis } from "../lib/redis";

type PendingExercise = {
    exerciseId: string;
    clientIds: string[];
    sets: number | null;
    reps: number | null;
    intensity: string | null;
    expiresAt: number;
};

const TTL_SECONDS = 600; // 10 minutes

export async function setPending(coachId: string, data: PendingExercise) {
    await redis.setex(`pending:ex:${coachId}`, TTL_SECONDS, JSON.stringify(data));
}

export async function getPending(coachId: string): Promise<PendingExercise | null> {
    const raw = await redis.get(`pending:ex:${coachId}`);
    return raw ? JSON.parse(raw) : null;
}

export async function clearPending(coachId: string) {
    await redis.del(`pending:ex:${coachId}`);
}
