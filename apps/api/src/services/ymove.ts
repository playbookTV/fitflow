const BASE = process.env.YMOVE_BASE_URL;
const KEY = process.env.YMOVE_API_KEY;

export type YMoveExercise = {
    id: string;
    slug: string;
    title: string;
    muscleGroup: string;
    equipment: string;
    thumbnailUrl?: string;
    videoUrl?: string;
    videoHlsUrl?: string;
    videoDurationSecs?: number;
    instructions?: string[];
};

async function ymoveGet<T>(path: string, retries = 2): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        headers: { "X-API-Key": KEY! },
    });

    if (res.status === 429 && retries > 0) {
        const body = await res.json();
        const retryAfterMs = body.retryAfterMs ?? 2000;
        await new Promise((r) => setTimeout(r, retryAfterMs));
        return ymoveGet(path, retries - 1);
    }

    if (!res.ok) {
        throw new Error(`YMove ${res.status}: ${path}`);
    }

    return res.json();
}

export async function searchExercises(params: {
    muscleGroup?: string;
    equipment?: string;
    search?: string;
    exerciseType?: string;
    limit?: number;
}): Promise<YMoveExercise[]> {
    const q = new URLSearchParams(
        Object.entries(params)
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)])
    );
    const data = await ymoveGet<{ exercises: YMoveExercise[] }>(`/exercises?${q}`);
    return data.exercises ?? [];
}

export async function fetchExercise(idOrSlug: string): Promise<YMoveExercise> {
    return ymoveGet<YMoveExercise>(`/exercises/${idOrSlug}`);
}

export async function fetchUsage(): Promise<{
    monthlyVideoMinutesUsed: number;
    monthlyVideoMinuteLimit: number;
}> {
    const data = await ymoveGet<Record<string, unknown>>("/usage");
    const used = Number(data.monthlyVideoMinutesUsed);
    const limit = Number(data.monthlyVideoMinuteLimit);

    if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) {
        throw new Error(
            `[YMove] Invalid usage response: used=${data.monthlyVideoMinutesUsed}, limit=${data.monthlyVideoMinuteLimit}`
        );
    }

    return { monthlyVideoMinutesUsed: used, monthlyVideoMinuteLimit: limit };
}
