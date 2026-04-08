import {
    TemplateId,
    TemplateDefinition,
    AtRiskMissedWorkoutContext,
    AtRiskThreePlusContext,
    AtRiskLapsedContext,
} from "@fitflow/shared";
import { escapeMarkdownV2 as esc } from "./escape";
import { registerTemplate } from "./registry";

const atRiskMissedWorkout: TemplateDefinition<AtRiskMissedWorkoutContext> = {
    id: TemplateId.ATRISK_MISSED_WORKOUT,
    description: "Follow-up after client skips or misses a single session",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `No worries on today's session, ${esc(ctx.client_first_name)} \u{2014} life happens\\.\n\n` +
                    `If something's come up or you need to adjust the schedule, just let me know\\. I'd rather know than have you fall off quietly\\.\n\n` +
                    `${esc(ctx.coach_first_name)}`,
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `No worries on today's session, ${ctx.client_first_name} \u{2014} life happens.\n\n` +
                    `If something's come up or you need to adjust the schedule, just let me know. I'd rather know than have you fall off quietly.\n\n` +
                    `${ctx.coach_first_name}`,
            }),
        },
    },
};

const atRiskThreePlus: TemplateDefinition<AtRiskThreePlusContext> = {
    id: TemplateId.ATRISK_THREE_PLUS,
    description: "At-risk flag after 3+ missed sessions or 5+ days no response",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `${esc(ctx.client_first_name)} \u{2014} checking in on you\\.\n\n` +
                    `A few sessions have slipped and I haven't heard from you\\. No pressure, just want to make sure you're alright and understand if anything needs adjusting\\.\n\n` +
                    `Drop me a message when you can\\.\n\n` +
                    `${esc(ctx.coach_first_name)}`,
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `${ctx.client_first_name}, I've noticed you've been quiet for a few days and a few sessions have slipped.\n\n` +
                    `I'm not here to lecture \u{2014} I just want to check in as your coach. Is everything okay? Has something changed that we should adjust for?\n\n` +
                    `Even a quick reply helps me understand where you're at.\n\n` +
                    `${ctx.coach_first_name}`,
            }),
        },
    },
};

const atRiskLapsed: TemplateDefinition<AtRiskLapsedContext> = {
    id: TemplateId.ATRISK_LAPSED,
    description: "Re-engagement for fully lapsed client (10+ days inactive)",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `Hey ${esc(ctx.client_first_name)},\n\n` +
                    `It's been a while and I don't want to just quietly let your programme expire without reaching out properly\\.\n\n` +
                    `If things have gotten in the way, that's completely understandable\\. If you want to pause, restart, or just have a conversation about what's realistic right now \u{2014} I'm here for that\\.\n\n` +
                    `No pressure either way, but the door's open\\.\n\n` +
                    `${esc(ctx.coach_first_name)}`,
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `Hey ${ctx.client_first_name},\n\n` +
                    `It's been a while and I don't want to just quietly let your programme expire without reaching out properly.\n\n` +
                    `If things have gotten in the way, that's completely understandable. If you want to pause, restart, or just have a conversation about what's realistic right now \u{2014} I'm here for that.\n\n` +
                    `No pressure either way, but the door's open.\n\n` +
                    `${ctx.coach_first_name}`,
            }),
        },
    },
};

registerTemplate(atRiskMissedWorkout as TemplateDefinition);
registerTemplate(atRiskThreePlus as TemplateDefinition);
registerTemplate(atRiskLapsed as TemplateDefinition);
