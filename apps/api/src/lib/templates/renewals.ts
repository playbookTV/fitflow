import {
    TemplateId,
    TemplateDefinition,
    Renewal7DayContext,
    Renewal2DayContext,
    RenewalPostExpiryContext,
} from "@fitflow/shared";
import { escapeMarkdownV2 as esc, escapeMarkdownV2Url as escUrl } from "./escape";
import { registerTemplate } from "./registry";

const renewal7Day: TemplateDefinition<Renewal7DayContext> = {
    id: TemplateId.RENEWAL_7DAY,
    description: "Renewal reminder 7 days before expiry",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `Hey ${esc(ctx.client_first_name)},\n\n` +
                    `Your programme wraps up on *${esc(ctx.renewal_date)}* \u{2014} 7 days from now\\.\n\n` +
                    `[Renew here \u{2014} ${esc(ctx.renewal_amount)}](${escUrl(ctx.payment_link)})\n\n` +
                    `Renewing keeps everything intact \u{2014} your history, your plan, your progress\\. Let me know if you want to talk through what's next\\.\n\n` +
                    `${esc(ctx.coach_first_name)}`,
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `Hey ${ctx.client_first_name},\n\n` +
                    `Your current programme expires on ${ctx.renewal_date} \u{2014} that's 7 days away.\n\n` +
                    `If you'd like to continue, here's your renewal link:\n` +
                    `${ctx.payment_link}\n\n` +
                    `Renewing keeps your history, your plan, and your momentum intact. Happy to chat through what the next phase looks like if you're unsure.\n\n` +
                    `${ctx.coach_first_name}`,
            }),
        },
    },
};

const renewal2Day: TemplateDefinition<Renewal2DayContext> = {
    id: TemplateId.RENEWAL_2DAY,
    description: "Renewal reminder 2 days before expiry",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `${esc(ctx.client_first_name)} \u{2014} quick heads up, your programme ends in 2 days on ${esc(ctx.renewal_date)}\\.\n\n` +
                    `If you're continuing, now's the time to sort it so there's no break in your delivery:\n` +
                    `${esc(ctx.payment_link)}\n\n` +
                    `If you're taking a break, no problem \u{2014} just let me know so I can pause things cleanly\\.\n\n` +
                    `${esc(ctx.coach_first_name)}`,
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `${ctx.client_first_name} \u{2014} quick heads up, your programme ends in 2 days on ${ctx.renewal_date}.\n\n` +
                    `If you're continuing, now's the time to sort it so there's no break in your delivery:\n` +
                    `${ctx.payment_link}\n\n` +
                    `If you're taking a break, no problem \u{2014} just let me know so I can pause things cleanly.\n\n` +
                    `${ctx.coach_first_name}`,
            }),
        },
    },
};

const renewalPostExpiry: TemplateDefinition<RenewalPostExpiryContext> = {
    id: TemplateId.RENEWAL_POST_EXPIRY,
    description: "Post-expiry lapsed renewal (2 days after expiry)",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `Hey ${esc(ctx.client_first_name)},\n\n` +
                    `Your programme ended on ${esc(ctx.renewal_date)} and I haven't heard from you \u{2014} wanted to reach out before too much time passes\\.\n\n` +
                    `If you're ready to jump back in, I can get you reactivated quickly:\n` +
                    `${esc(ctx.payment_link)}\n\n` +
                    `If the timing isn't right, that's okay too\\. Just let me know either way\\.\n\n` +
                    `${esc(ctx.coach_first_name)}`,
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `Hey ${ctx.client_first_name},\n\n` +
                    `Your programme ended on ${ctx.renewal_date} and I haven't heard from you \u{2014} wanted to reach out before too much time passes.\n\n` +
                    `If you're ready to jump back in, I can get you reactivated quickly:\n` +
                    `${ctx.payment_link}\n\n` +
                    `If the timing isn't right, that's okay too. Just let me know either way.\n\n` +
                    `${ctx.coach_first_name}`,
            }),
        },
    },
};

registerTemplate(renewal7Day as TemplateDefinition);
registerTemplate(renewal2Day as TemplateDefinition);
registerTemplate(renewalPostExpiry as TemplateDefinition);
