import { EXERCISE_ALIASES, EQUIPMENT_ALIASES } from "./aliases";

const COMMAND_RE = /^\/(?:exercise|ex|send|workout)\s+(.+)$/i;
const SETS_REPS_RE = /(\d+)\s*[x×]\s*(\d+)/i;
const SETS_ONLY_RE = /(\d+)\s*sets?\s+of\s+(\d+)/i;
const INTENSITY_RE = /\b(heavy|light|moderate|easy|hard)\b/i;
const EQUIPMENT_RE =
    /\b(barbell|dumbbell|bb|db|bw|bodyweight|cable|machine|kb|kettlebell|band)\b/i;

export type ParsedCommand = {
    raw: string;
    exerciseName: string | null;
    muscleGroup: string | null;
    equipment: string | null;
    sets: number | null;
    reps: number | null;
    intensity: string | null;
    confidence: "high" | "low";
};

function normalise(word: string, map: Record<string, string>): string {
    return map[word.toLowerCase()] ?? word.toLowerCase();
}

export function regexParse(input: string): ParsedCommand | null {
    const match = input.match(COMMAND_RE);
    if (!match) return null;

    let working = match[1];

    // Extract sets/reps
    let sets: number | null = null;
    let reps: number | null = null;
    const setsReps = working.match(SETS_REPS_RE) ?? working.match(SETS_ONLY_RE);
    if (setsReps) {
        sets = parseInt(setsReps[1]);
        reps = parseInt(setsReps[2]);
        working = working.replace(setsReps[0], "").trim();
    }

    // Extract intensity
    let intensity: string | null = null;
    const intensityMatch = working.match(INTENSITY_RE);
    if (intensityMatch) {
        intensity = intensityMatch[1].toLowerCase();
        working = working.replace(intensityMatch[0], "").trim();
    }

    // Extract equipment
    let equipment: string | null = null;
    const equipMatch = working.match(EQUIPMENT_RE);
    if (equipMatch) {
        equipment = normalise(equipMatch[1], EQUIPMENT_ALIASES);
        working = working.replace(equipMatch[0], "").trim();
    }

    // What's left is the exercise name
    const rawName = working.trim();
    if (!rawName) return null;

    const exerciseName =
        EXERCISE_ALIASES[rawName.toLowerCase()] ?? rawName.toLowerCase();
    const muscleGroup = inferMuscleGroup(exerciseName);

    return {
        raw: input,
        exerciseName,
        muscleGroup,
        equipment,
        sets,
        reps,
        intensity,
        confidence: sets && reps ? "high" : "low",
    };
}

function inferMuscleGroup(name: string): string | null {
    const map: Array<[RegExp, string]> = [
        [/bench|chest|fly|pec/i, "chest"],
        [/squat|quad|lunge|leg press/i, "quads"],
        [/deadlift|row|pull|lat|back/i, "back"],
        [/curl|bicep/i, "biceps"],
        [/tricep|skull|pushdown|dip/i, "triceps"],
        [/press|delt|shoulder|lateral/i, "shoulders"],
        [/rdl|hamstring/i, "hamstrings"],
        [/glute|hip thrust|bridge/i, "glutes"],
        [/calf|calves/i, "calves"],
        [/ab|core|plank|crunch/i, "core"],
    ];
    for (const [re, group] of map) {
        if (re.test(name)) return group;
    }
    return null;
}
