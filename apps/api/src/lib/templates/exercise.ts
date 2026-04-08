import {
    TemplateId,
    TemplateDefinition,
    ExerciseVideoContext,
} from "@fitflow/shared";
import { escapeMarkdownV2 as esc } from "./escape";
import { registerTemplate } from "./registry";

const exerciseVideo: TemplateDefinition<ExerciseVideoContext> = {
    id: TemplateId.EXERCISE_VIDEO,
    description: "Exercise demo video caption for daily workout delivery",
    channels: {
        telegram: {
            render: (ctx) => {
                const lines = [`*${esc(ctx.exercise_name)}*`];
                if (ctx.muscle_group) lines.push(`\u{1F4AA} ${esc(ctx.muscle_group)}`);
                if (ctx.sets && ctx.reps) lines.push(`\u{1F4CB} ${ctx.sets} \u00D7 ${esc(ctx.reps)} reps`);
                else if (ctx.sets) lines.push(`\u{1F4CB} ${ctx.sets} sets`);
                if (ctx.instructions) lines.push(`\n${esc(ctx.instructions)}`);
                return { text: lines.join("\n"), parseMode: "MarkdownV2" };
            },
        },
        whatsapp: {
            render: (ctx) => {
                const lines = [`*${ctx.exercise_name}*`];
                if (ctx.muscle_group) lines.push(`\u{1F4AA} ${ctx.muscle_group}`);
                if (ctx.sets && ctx.reps) lines.push(`\u{1F4CB} ${ctx.sets} \u00D7 ${ctx.reps} reps`);
                else if (ctx.sets) lines.push(`\u{1F4CB} ${ctx.sets} sets`);
                if (ctx.instructions) lines.push(`\n${ctx.instructions}`);
                return { text: lines.join("\n") };
            },
        },
    },
};

registerTemplate(exerciseVideo as TemplateDefinition);
