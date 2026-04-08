import { getCachedMeta, getFreshVideoUrl } from "./exerciseCache";

type ExerciseMessageParams = {
    exerciseId: string;
    sets: number | null;
    reps: number | null;
    intensity: string | null;
};

export async function buildExerciseMessage(params: ExerciseMessageParams) {
    const { exerciseId, sets, reps, intensity } = params;

    const meta = await getCachedMeta(exerciseId);
    const { videoUrl, thumbnailUrl } = await getFreshVideoUrl(exerciseId);
    const caption = formatCaption({ meta, sets, reps, intensity });

    return { videoUrl, thumbnailUrl, caption, meta };
}

function formatCaption({
    meta,
    sets,
    reps,
    intensity,
}: {
    meta: { title: string; muscleGroup?: string; instructions?: string[] };
    sets: number | null;
    reps: number | null;
    intensity: string | null;
}) {
    const lines = [`*${meta.title}*`];
    if (meta.muscleGroup) lines.push(`\u{1F4AA} ${capitalise(meta.muscleGroup)}`);
    if (sets && reps) lines.push(`\u{1F4CB} ${sets} \u00D7 ${reps} reps`);
    else if (sets) lines.push(`\u{1F4CB} ${sets} sets`);
    if (intensity) lines.push(`\u{26A1} ${capitalise(intensity)}`);
    if (meta.instructions?.[0]) lines.push(`\n${meta.instructions[0]}`);
    return lines.join("\n");
}

function capitalise(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
