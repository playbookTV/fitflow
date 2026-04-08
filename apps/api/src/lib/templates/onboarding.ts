import {
    TemplateId,
    TemplateDefinition,
    OnboardingWelcomeContext,
    OnboardingCompleteContext,
} from "@fitflow/shared";
import { escapeMarkdownV2 as esc } from "./escape";
import { registerTemplate } from "./registry";

const onboardingWelcome: TemplateDefinition<OnboardingWelcomeContext> = {
    id: TemplateId.ONBOARDING_WELCOME,
    description: "Welcome message with structured intake (inline keyboard for TG)",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `Welcome to ${esc(ctx.offer_name)}, ${esc(ctx.client_first_name)}\\! \u{1F44A}\n\n` +
                    `Before your first session I need a few details\\. I'll ask you a series of quick questions \u{2014} just tap your answers\\.\n\n` +
                    `First up: what's your main goal for this programme?`,
                buttons: [
                    [
                        { text: "\u{1F525} Fat loss", callback_data: `onboard_goal_fatloss_${ctx.clientId}` },
                        { text: "\u{1F4AA} Muscle gain", callback_data: `onboard_goal_muscle_${ctx.clientId}` },
                    ],
                    [
                        { text: "\u{2764}\u{FE0F} General fitness", callback_data: `onboard_goal_fitness_${ctx.clientId}` },
                        { text: "\u{1F3C3} Endurance", callback_data: `onboard_goal_endurance_${ctx.clientId}` },
                    ],
                ],
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `Welcome to ${ctx.offer_name}, ${ctx.client_first_name}! \u{1F44A}\n\n` +
                    `Before your first session, I need a few details to build your plan. This takes about 5 minutes and happens right here in WhatsApp.\n\n` +
                    `Hit the button below to get started \u{1F447}`,
            }),
        },
    },
};

const onboardingComplete: TemplateDefinition<OnboardingCompleteContext> = {
    id: TemplateId.ONBOARDING_COMPLETE,
    description: "Sent after client completes all onboarding questions",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `That's everything I need, ${esc(ctx.client_first_name)} \u{2014} thanks for taking the time\\.\n\n` +
                    `I'm building your personalised plan now\\. You'll receive your first workout on ${esc(ctx.programme_start_date)}\\.\n\n` +
                    `In the meantime, here's what to expect:\n` +
                    `\u{2022} Workouts delivered here every morning\n` +
                    `\u{2022} Weekly check\\-in every ${esc(ctx.next_checkin_day)}\n` +
                    `\u{2022} Message me anytime if something comes up\n\n` +
                    `See you on ${esc(ctx.programme_start_date)} \u{1F4AA}\n\n` +
                    `${esc(ctx.coach_first_name)}`,
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `That's everything I need, ${ctx.client_first_name} \u{2014} thanks for taking the time.\n\n` +
                    `I'm building your personalised plan now. You'll receive your first workout on ${ctx.programme_start_date}.\n\n` +
                    `In the meantime, here's what to expect:\n` +
                    `\u{2022} Workouts delivered here every morning\n` +
                    `\u{2022} Weekly check-in every ${ctx.next_checkin_day}\n` +
                    `\u{2022} Message me anytime if something comes up\n\n` +
                    `See you on ${ctx.programme_start_date} \u{1F4AA}\n\n` +
                    `${ctx.coach_first_name}`,
            }),
        },
    },
};

registerTemplate(onboardingWelcome as TemplateDefinition);
registerTemplate(onboardingComplete as TemplateDefinition);
