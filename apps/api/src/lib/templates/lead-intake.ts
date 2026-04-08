import {
    TemplateId,
    TemplateDefinition,
    LeadEnquiryContext,
    LeadPaymentRequestContext,
    LeadPaymentConfirmedContext,
} from "@fitflow/shared";
import { escapeMarkdownV2 as esc } from "./escape";
import { registerTemplate } from "./registry";

const leadEnquiryResponse: TemplateDefinition<LeadEnquiryContext> = {
    id: TemplateId.LEAD_ENQUIRY_RESPONSE,
    description: "Initial response when a prospect messages or clicks an offer link",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `Hi ${esc(ctx.client_first_name)} \u{1F44B}\n\n` +
                    `Thanks for your interest in ${esc(ctx.offer_name)}\\. Click below to complete your intake \u{2014} it takes about 3 minutes\\.\n\n` +
                    `[Complete intake form](${esc(ctx.intake_link)})\n\n` +
                    `I'll review your details and confirm your spot shortly\\.\n\n` +
                    `\u{2014} ${esc(ctx.coach_first_name)}`,
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `Hi ${ctx.client_first_name} \u{1F44B}\n\n` +
                    `Thanks for reaching out about ${ctx.offer_name}. I'd love to get you started.\n\n` +
                    `Here's your intake link \u{2014} takes about 3 minutes to complete:\n` +
                    `${ctx.intake_link}\n\n` +
                    `Once I've reviewed your details, I'll be in touch to confirm your spot.\n\n` +
                    `\u{2014} ${ctx.coach_first_name}`,
            }),
        },
    },
};

const leadPaymentRequest: TemplateDefinition<LeadPaymentRequestContext> = {
    id: TemplateId.LEAD_PAYMENT_REQUEST,
    description: "Payment request sent after coach reviews intake and accepts the client",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `Hi ${esc(ctx.client_first_name)},\n\n` +
                    `You're confirmed as a great fit for ${esc(ctx.offer_name)} \u{2014} excited to work with you\\.\n\n` +
                    `Complete your payment below to lock in your spot:\n\n` +
                    `[Pay now \u{2014} ${esc(ctx.offer_name)}](${esc(ctx.payment_link)})\n\n` +
                    `I'll activate your programme as soon as payment goes through\\.\n\n` +
                    `${esc(ctx.coach_first_name)}`,
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `Hi ${ctx.client_first_name},\n\n` +
                    `Great news \u{2014} you're a good fit for ${ctx.offer_name} and I'd love to work with you.\n\n` +
                    `To secure your spot, complete your payment here:\n` +
                    `${ctx.payment_link}\n\n` +
                    `Once payment is confirmed, I'll activate your programme and send over everything you need to get started.\n\n` +
                    `Any questions before you go ahead, just ask.\n\n` +
                    `${ctx.coach_first_name}`,
            }),
        },
    },
};

const leadPaymentConfirmed: TemplateDefinition<LeadPaymentConfirmedContext> = {
    id: TemplateId.LEAD_PAYMENT_CONFIRMED,
    description: "Activation notice after payment confirmed (Stripe or bank transfer)",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `${esc(ctx.client_first_name)}, payment confirmed \u{2014} you're officially on the programme\\! \u{1F389}\n\n` +
                    `*${esc(ctx.offer_name)}* starts *${esc(ctx.programme_start_date)}*\\.\n\n` +
                    `Your onboarding is coming up next\\. Complete it as soon as you can so I can build your personalised plan before day one\\.\n\n` +
                    `${esc(ctx.coach_first_name)}`,
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `${ctx.client_first_name}, you're in! \u{1F389}\n\n` +
                    `Payment confirmed. Your ${ctx.offer_name} programme starts ${ctx.programme_start_date}.\n\n` +
                    `Your onboarding will arrive shortly \u{2014} please complete it before we kick off so I can personalise your plan.\n\n` +
                    `Let's get to work.\n\n` +
                    `${ctx.coach_first_name}`,
            }),
        },
    },
};

registerTemplate(leadEnquiryResponse as TemplateDefinition);
registerTemplate(leadPaymentRequest as TemplateDefinition);
registerTemplate(leadPaymentConfirmed as TemplateDefinition);
