import { parseExerciseCommand, ParsedCommand } from "../parser";
import { getCachedSearch } from "../services/exerciseCache";
import { searchExercises, YMoveExercise } from "../services/ymove";

type ExerciseResult = Omit<YMoveExercise, "videoUrl" | "videoHlsUrl">;

type CommandResult =
    | { type: "error"; message: string }
    | { type: "confirm"; parsed: ParsedCommand; exercise: ExerciseResult }
    | {
          type: "picker";
          parsed: ParsedCommand;
          exercises: ExerciseResult[];
          fallback: boolean;
      };

export async function handleExerciseCommand(
    coachId: string,
    rawInput: string
): Promise<CommandResult> {
    const parsed = await parseExerciseCommand(rawInput);

    if (!parsed || !parsed.exerciseName) {
        return {
            type: "error",
            message: "Couldn't parse that. Try: /exercise bench press 3x10",
        };
    }

    const cacheKey = [parsed.exerciseName, parsed.muscleGroup, parsed.equipment]
        .filter(Boolean)
        .join("_");

    const results = await getCachedSearch(cacheKey, () =>
        searchExercises({
            search: parsed.exerciseName!,
            muscleGroup: parsed.muscleGroup ?? undefined,
            equipment: parsed.equipment ?? undefined,
            limit: 8,
        })
    );

    if (results.length === 0) {
        // Fallback: search by muscle group only
        const fallback = await searchExercises({
            muscleGroup: parsed.muscleGroup ?? undefined,
            limit: 8,
        });
        return {
            type: "picker",
            parsed,
            exercises: fallback,
            fallback: true,
        };
    }

    if (results.length === 1) {
        return { type: "confirm", parsed, exercise: results[0] };
    }

    return { type: "picker", parsed, exercises: results, fallback: false };
}
