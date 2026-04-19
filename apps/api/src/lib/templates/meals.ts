import {
    TemplateId,
    TemplateDefinition,
    MealDailyContext,
    MealRestDayContext,
    MealLoggedConfirmationContext,
    MealMissedNudgeContext,
} from "@fitflow/shared";
import { escapeMarkdownV2 as esc } from "./escape";
import { registerTemplate } from "./registry";

function formatCalories(cal: number): string {
    return cal >= 1000 ? cal.toLocaleString("en-US") : String(cal);
}

const mealDaily: TemplateDefinition<MealDailyContext> = {
    id: TemplateId.MEAL_DAILY,
    description: "Daily meal plan delivery with grouped meals and macro breakdown",
    channels: {
        telegram: {
            render: (ctx) => {
                const header = ctx.day_title
                    ? `*Day ${ctx.day_number} \u2014 ${esc(ctx.day_title)}* \u{1F37D}\u{FE0F}`
                    : `*Day ${ctx.day_number}* \u{1F37D}\u{FE0F}`;

                const prepLine = ctx.total_prep_time
                    ? `\n\u{23F1}\u{FE0F} ${esc(ctx.total_prep_time)} total prep\n`
                    : "";

                return {
                    text:
                        `Hey ${esc(ctx.client_first_name)}, here's your plan for today\\.\n\n` +
                        `${header}\n` +
                        `${esc(ctx.plan_title)}\n\n` +
                        `${esc(ctx.meals_list)}\n` +
                        `${prepLine}\n` +
                        `\u{1F4CA} *Daily Totals*\n` +
                        `Protein: ${ctx.protein}g\n` +
                        `Carbs: ${ctx.carbs}g\n` +
                        `Fat: ${ctx.fat}g\n` +
                        `Calories: ${formatCalories(ctx.calories)}\n\n` +
                        `How did it go?`,
                    buttons: [
                        [
                            { text: "\u{2705} Done", callback_data: `meal_done_${ctx.day_number}` },
                            { text: "\u{23ED} Skipped", callback_data: `meal_skip_${ctx.day_number}` },
                        ],
                    ],
                    parseMode: "MarkdownV2",
                };
            },
        },
        whatsapp: {
            render: (ctx) => {
                const header = ctx.day_title
                    ? `*Day ${ctx.day_number} \u2014 ${ctx.day_title}* \u{1F37D}\u{FE0F}`
                    : `*Day ${ctx.day_number}* \u{1F37D}\u{FE0F}`;

                const prepLine = ctx.total_prep_time
                    ? `\n\u{23F1}\u{FE0F} ${ctx.total_prep_time} total prep\n`
                    : "";

                return {
                    text:
                        `Hey ${ctx.client_first_name}, here's your plan for today.\n\n` +
                        `${header}\n` +
                        `${ctx.plan_title}\n\n` +
                        `${ctx.meals_list}\n` +
                        `${prepLine}\n` +
                        `\u{1F4CA} *Daily Totals*\n` +
                        `Protein: ${ctx.protein}g\n` +
                        `Carbs: ${ctx.carbs}g\n` +
                        `Fat: ${ctx.fat}g\n` +
                        `Calories: ${formatCalories(ctx.calories)}\n\n` +
                        `How did it go?`,
                    buttons: [
                        [
                            { text: "\u{2705} Done", callback_data: `meal_done_${ctx.day_number}` },
                            { text: "\u{23ED} Skipped", callback_data: `meal_skip_${ctx.day_number}` },
                        ],
                    ],
                };
            },
        },
    },
};

const mealRestDay: TemplateDefinition<MealRestDayContext> = {
    id: TemplateId.MEAL_REST_DAY,
    description: "Non-meal-plan day with flexible eating guidance",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `No structured meals today, ${esc(ctx.client_first_name)} \u{1F343}\n\n` +
                    `Keep your protein up and stay hydrated\\. If you need ideas, check your plan in the dashboard — yesterday's meals work well as a repeat\\.\n\n` +
                    `${esc(ctx.coach_first_name)}`,
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `No structured meals today, ${ctx.client_first_name} \u{1F343}\n\n` +
                    `Keep your protein up and stay hydrated. If you need ideas, check your plan in the dashboard — yesterday's meals work well as a repeat.\n\n` +
                    `${ctx.coach_first_name}`,
            }),
        },
    },
};

const mealLoggedConfirmation: TemplateDefinition<MealLoggedConfirmationContext> = {
    id: TemplateId.MEAL_LOGGED_CONFIRMATION,
    description: "Confirmation after client logs they followed the meal plan",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `\u{1F64C} Meal plan logged for Day ${ctx.day_number}\\.\n\n` +
                    `Nice work, ${esc(ctx.client_first_name)}\\! Your meal compliance is now ${ctx.compliance}%\\. Keep it up\\! \u{1F957}`,
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `\u{1F64C} Meal plan logged for Day ${ctx.day_number}.\n\n` +
                    `Nice work, ${ctx.client_first_name}! Your meal compliance is now ${ctx.compliance}%. Keep it up! \u{1F957}`,
            }),
        },
    },
};

const mealMissedNudge: TemplateDefinition<MealMissedNudgeContext> = {
    id: TemplateId.MEAL_MISSED_NUDGE,
    description: "Gentle nudge if client hasn't logged their meal plan",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `Hey ${esc(ctx.client_first_name)}, quick reminder — did you follow yesterday's meal plan? \\(Day ${ctx.day_number}, ${esc(ctx.plan_title)}\\)\n\n` +
                    `Even a rough log helps your coach keep your nutrition on track\\. Reply Done or Skipped when you get a moment \u{1F447}`,
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `Hey ${ctx.client_first_name}, quick reminder — did you follow yesterday's meal plan? (Day ${ctx.day_number}, ${ctx.plan_title})\n\n` +
                    `Even a rough log helps your coach keep your nutrition on track.`,
                buttons: [
                    [
                        { text: "\u{2705} Done", callback_data: `meal_done_${ctx.day_number}` },
                        { text: "\u{23ED} Skipped", callback_data: `meal_skip_${ctx.day_number}` },
                    ],
                ],
            }),
        },
    },
};

registerTemplate(mealDaily as TemplateDefinition);
registerTemplate(mealRestDay as TemplateDefinition);
registerTemplate(mealLoggedConfirmation as TemplateDefinition);
registerTemplate(mealMissedNudge as TemplateDefinition);
