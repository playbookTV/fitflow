import { redis } from "../lib/redis";
import { fetchExercise, YMoveExercise } from "./ymove";

const TTL_SECONDS = 82800; // 23 hours

export async function getCachedSearch(
    key: string,
    fetcher: () => Promise<YMoveExercise[]>
): Promise<Omit<YMoveExercise, "videoUrl" | "videoHlsUrl">[]> {
    const cached = await redis.get(`ex:search:${key}`);
    if (cached) return JSON.parse(cached);

    const results = await fetcher();
    // Strip video URLs before caching — they expire and must never be stored
    const safe = results.map(({ videoUrl, videoHlsUrl, ...rest }) => rest);
    await redis.setex(`ex:search:${key}`, TTL_SECONDS, JSON.stringify(safe));
    return safe;
}

export async function getCachedMeta(
    id: string
): Promise<Omit<YMoveExercise, "videoUrl" | "videoHlsUrl">> {
    const cached = await redis.get(`ex:meta:${id}`);
    if (cached) return JSON.parse(cached);

    const ex = await fetchExercise(id);
    const { videoUrl, videoHlsUrl, ...meta } = ex;
    await redis.setex(`ex:meta:${id}`, TTL_SECONDS, JSON.stringify(meta));
    return meta;
}

/** Always fetches fresh — never cached. Call immediately before sending. */
export async function getFreshVideoUrl(
    id: string
): Promise<{ videoUrl: string; thumbnailUrl: string }> {
    const ex = await fetchExercise(id);
    if (!ex.videoUrl) {
        throw new YMoveCapExceededError(id);
    }
    return { videoUrl: ex.videoUrl, thumbnailUrl: ex.thumbnailUrl! };
}

export class YMoveCapExceededError extends Error {
    constructor(exerciseId: string) {
        super(
            `No video URL for exercise ${exerciseId} — YMove monthly cap may be exceeded`
        );
        this.name = "YMoveCapExceededError";
    }
}
