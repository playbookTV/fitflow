import {
    TemplateId,
    TemplateDefinition,
    CheckinWeeklyPromptContext,
    CheckinCoachAckContext,
    CheckinMissedNudgeContext,
} from "@fitflow/shared";
import { escapeMarkdownV2 as esc } from "./escape";
import { registerTemplate } from "./registry";

const checkinWeeklyPrompt: TemplateDefinition<CheckinWeeklyPromptContext> = {
    id: TemplateId.CHECKIN_WEEKLY_PROMPT,
    description: "Weekly check-in prompt with inline keyboard",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `Check\\-in time, ${esc(ctx.client_first_name)} \u{1F4CB} \u{2014} Week ${ctx.programme_week} of ${ctx.total_weeks}\\.\n\n` +
                    `Let's start with your weight this week\\. What are you sitting at?`,
                buttons: [
                    [
                        { text: "\u{2705} Start Check-in", callback_data: `checkin_start_${ctx.clientId}` },
                    ],
                ],
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `Check-in time, ${ctx.client_first_name} \u{1F4CB}\n\n` +
                    `Week ${ctx.programme_week} of ${ctx.total_weeks}. Takes 2 minutes.`,
                buttons: [
                    [
                        { text: "\u{2705} Start Check-in", callback_data: `checkin_start_${ctx.clientId}` },
                    ],
                ],
            }),
        },
    },
};

const checkinCoachAck: TemplateDefinition<CheckinCoachAckContext> = {
    id: TemplateId.CHECKIN_COACH_ACK,
    description: "Coach acknowledgement after client completes check-in",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `Got your check\\-in, ${esc(ctx.client_first_name)} \u{2014} thanks for being consistent with this \u{1F64F}\n\n` +
                    `I'll review it today and adjust anything that needs tweaking\\. Keep doing what you're doing\\.\n\n` +
                    `${esc(ctx.coach_first_name)}`,
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `Got your check-in, ${ctx.client_first_name} \u{2014} thanks for being consistent with this \u{1F64F}\n\n` +
                    `I'll review it today and adjust anything that needs tweaking. Keep doing what you're doing.\n\n` +
                    `${ctx.coach_first_name}`,
            }),
        },
    },
};

const checkinMissedNudge: TemplateDefinition<CheckinMissedNudgeContext> = {
    id: TemplateId.CHECKIN_MISSED_NUDGE,
    description: "Nudge sent 24h after missed check-in",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `Hey ${esc(ctx.client_first_name)} \u{2014} your week ${ctx.programme_week} check\\-in hasn't come through yet\\.\n\n` +
                    `[Complete your check\\-in here](${esc(ctx.checkin_link)})\n\n` +
                    `Only 2 minutes\\. Let's keep the streak going \u{1F4AA}`,
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `Hey ${ctx.client_first_name}, just a nudge \u{2014} your week ${ctx.programme_week} check-in is still outstanding.\n\n` +
                    `Only takes 2 minutes.`,
                buttons: [
                    [
                        { text: "\u{2705} Start Check-in", callback_data: `checkin_start_${ctx.clientId}` },
                    ],
                ],
            }),
        },
    },
};

registerTemplate(checkinWeeklyPrompt as TemplateDefinition);
registerTemplate(checkinCoachAck as TemplateDefinition);
registerTemplate(checkinMissedNudge as TemplateDefinition);
