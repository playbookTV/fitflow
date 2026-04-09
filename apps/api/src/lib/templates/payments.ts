import {
    TemplateId,
    TemplateDefinition,
    PaymentReminderContext,
} from "@fitflow/shared";
import { escapeMarkdownV2 as esc } from "./escape";
import { registerTemplate } from "./registry";

const paymentReminder: TemplateDefinition<PaymentReminderContext> = {
    id: TemplateId.PAYMENT_REMINDER,
    description: "Payment reminder for outstanding pending payment",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `Hey ${esc(ctx.client_first_name)},\n\n` +
                    `Just a friendly reminder about your outstanding payment of *${esc(ctx.amount)}*\\.\n\n` +
                    `You can pay here when you're ready:\n` +
                    `${esc(ctx.payment_link)}\n\n` +
                    `Let me know if you have any questions\\.\n\n` +
                    `${esc(ctx.coach_first_name)}`,
                parseMode: "MarkdownV2",
                buttons: [[{ text: `Pay ${ctx.amount}`, url: ctx.payment_link }]],
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `Hey ${ctx.client_first_name},\n\n` +
                    `Just a friendly reminder about your outstanding payment of ${ctx.amount}.\n\n` +
                    `You can pay here when you're ready:\n` +
                    `${ctx.payment_link}\n\n` +
                    `Let me know if you have any questions.\n\n` +
                    `${ctx.coach_first_name}`,
            }),
        },
    },
};

registerTemplate(paymentReminder as TemplateDefinition);
