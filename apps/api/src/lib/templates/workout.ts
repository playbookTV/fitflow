import {
    TemplateId,
    TemplateDefinition,
    WorkoutDailyContext,
    WorkoutRestDayContext,
    WorkoutWeekSummaryContext,
    WorkoutLoggedConfirmationContext,
} from "@fitflow/shared";
import { escapeMarkdownV2 as esc } from "./escape";
import { registerTemplate } from "./registry";

const workoutDaily: TemplateDefinition<WorkoutDailyContext> = {
    id: TemplateId.WORKOUT_DAILY,
    description: "Daily workout delivery with exercise list and completion buttons",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `*Day ${ctx.workout_day_number} \u{2014} ${esc(ctx.workout_name)}* \u{1F4AA}\n\n` +
                    `${esc(ctx.exercise_list)}\n\n` +
                    `How did it go?`,
                buttons: [
                    [
                        { text: "\u{2705} Done", callback_data: `workout_done_${ctx.clientId}` },
                        { text: "\u{23ED} Skipped", callback_data: `workout_skip_${ctx.clientId}` },
                        { text: "\u{1F504} Modified", callback_data: `workout_modified_${ctx.clientId}` },
                    ],
                ],
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `*Day ${ctx.workout_day_number} \u{2014} ${ctx.workout_name}* \u{1F4AA}\n\n` +
                    `${ctx.exercise_list}\n\n` +
                    `Hit *Done \u{2705}* when you've finished, *Skipped \u{23ED}* if you can't make it today, or *Modified \u{1F504}* if you changed something.`,
            }),
        },
    },
};

const workoutRestDay: TemplateDefinition<WorkoutRestDayContext> = {
    id: TemplateId.WORKOUT_REST_DAY,
    description: "Rest day message",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `Rest day today, ${esc(ctx.client_first_name)} \u{1F6CC}\n\n` +
                    `Recovery is part of the programme \u{2014} take it seriously\\. Stay hydrated, move gently if you can, and I'll see you tomorrow\\.\n\n` +
                    `${esc(ctx.coach_first_name)}`,
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `Rest day today, ${ctx.client_first_name} \u{1F6CC}\n\n` +
                    `Recovery is part of the programme \u{2014} take it seriously. Stay hydrated, move gently if you can, and I'll see you tomorrow.\n\n` +
                    `${ctx.coach_first_name}`,
            }),
        },
    },
};

const workoutWeekSummary: TemplateDefinition<WorkoutWeekSummaryContext> = {
    id: TemplateId.WORKOUT_WEEK_SUMMARY,
    description: "End-of-week summary with stats",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `*Week ${ctx.programme_week} of ${ctx.total_weeks} wrapped\\.* \u{1F5D3}\n\n` +
                    `${esc(ctx.weekly_summary)}\n\n` +
                    `Check\\-in lands tomorrow morning\\. See you then\\.\n\n` +
                    `${esc(ctx.coach_first_name)}`,
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `*Week ${ctx.programme_week} of ${ctx.total_weeks} \u{2014} done.* \u{1F5D3}\n\n` +
                    `Here's how you did this week:\n\n` +
                    `${ctx.weekly_summary}\n\n` +
                    `Your check-in is due tomorrow. I'll send it first thing. Keep the momentum going.\n\n` +
                    `${ctx.coach_first_name}`,
            }),
        },
    },
};

const workoutLoggedConfirmation: TemplateDefinition<WorkoutLoggedConfirmationContext> = {
    id: TemplateId.WORKOUT_LOGGED_CONFIRMATION,
    description: "Confirmation after client logs a workout as done",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `\u{1F525} *Boom\\!* Workout logged for Day ${ctx.workout_day_number}\\.\n\n` +
                    `Great work, ${esc(ctx.client_first_name)}\\! Your compliance is now ${ctx.compliance}%\\. Keep it up\\! \u{1F3CB}\u{FE0F}\u{200D}\u{2642}\u{FE0F}`,
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `\u{1F525} *Boom!* Workout logged for Day ${ctx.workout_day_number}.\n\n` +
                    `Great work, ${ctx.client_first_name}! Your compliance is now ${ctx.compliance}%. Keep it up! \u{1F3CB}\u{FE0F}`,
            }),
        },
    },
};

registerTemplate(workoutDaily as TemplateDefinition);
registerTemplate(workoutRestDay as TemplateDefinition);
registerTemplate(workoutWeekSummary as TemplateDefinition);
registerTemplate(workoutLoggedConfirmation as TemplateDefinition);
