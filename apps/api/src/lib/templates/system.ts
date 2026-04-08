import {
    TemplateId,
    TemplateDefinition,
    SystemBankDetailsContext,
    SystemBankConfirmedContext,
    SystemBroadcastContext,
} from "@fitflow/shared";
import { escapeMarkdownV2 as esc } from "./escape";
import { registerTemplate } from "./registry";

const systemBankDetails: TemplateDefinition<SystemBankDetailsContext> = {
    id: TemplateId.SYSTEM_BANK_DETAILS,
    description: "Bank transfer details sent when client selects bank transfer payment",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `Hi ${esc(ctx.client_first_name)},\n\n` +
                    `Here are the bank transfer details for ${esc(ctx.offer_name)}:\n\n` +
                    `${esc(ctx.bank_transfer_details)}\n\n` +
                    `Please use your name as the reference\\. Once I've received payment I'll confirm and get your programme set up straight away\\.\n\n` +
                    `${esc(ctx.coach_first_name)}`,
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `Hi ${ctx.client_first_name},\n\n` +
                    `Here are the bank transfer details for ${ctx.offer_name}:\n\n` +
                    `${ctx.bank_transfer_details}\n\n` +
                    `Please use your name as the reference. Once I've received payment I'll confirm and get your programme set up straight away.\n\n` +
                    `${ctx.coach_first_name}`,
            }),
        },
    },
};

const systemBankConfirmed: TemplateDefinition<SystemBankConfirmedContext> = {
    id: TemplateId.SYSTEM_BANK_CONFIRMED,
    description: "Bank transfer payment confirmed by coach",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `Payment received, ${esc(ctx.client_first_name)} \u{2014} thank you \u{1F64F}\n\n` +
                    `I'm activating your programme now\\. Your onboarding will arrive shortly\\.\n\n` +
                    `${esc(ctx.coach_first_name)}`,
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `Payment received, ${ctx.client_first_name} \u{2014} thank you \u{1F64F}\n\n` +
                    `I'm activating your programme now. Your onboarding will arrive shortly.\n\n` +
                    `${ctx.coach_first_name}`,
            }),
        },
    },
};

const systemBroadcast: TemplateDefinition<SystemBroadcastContext> = {
    id: TemplateId.SYSTEM_BROADCAST,
    description: "Coach-initiated broadcast message to selected clients",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `Hey ${esc(ctx.client_first_name)},\n\n` +
                    `${esc(ctx.broadcast_message)}\n\n` +
                    `${esc(ctx.coach_first_name)}`,
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `Hey ${ctx.client_first_name},\n\n` +
                    `${ctx.broadcast_message}\n\n` +
                    `${ctx.coach_first_name}`,
            }),
        },
    },
};

registerTemplate(systemBankDetails as TemplateDefinition);
registerTemplate(systemBankConfirmed as TemplateDefinition);
registerTemplate(systemBroadcast as TemplateDefinition);
