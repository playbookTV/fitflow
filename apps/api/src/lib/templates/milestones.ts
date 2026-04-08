import {
    TemplateId,
    TemplateDefinition,
    MilestoneHalfwayContext,
    MilestoneCompletionContext,
} from "@fitflow/shared";
import { escapeMarkdownV2 as esc } from "./escape";
import { registerTemplate } from "./registry";

const milestoneHalfway: TemplateDefinition<MilestoneHalfwayContext> = {
    id: TemplateId.MILESTONE_HALFWAY,
    description: "Halfway point celebration",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `Halfway there, ${esc(ctx.client_first_name)} \u{1F3C1}\n\n` +
                    `Week ${ctx.programme_week} of ${ctx.total_weeks} complete\\. That's no small thing \u{2014} a lot of people don't make it this far\\.\n\n` +
                    `Take a moment to recognise what you've put in\\. The second half is where the real results compound\\.\n\n` +
                    `${esc(ctx.coach_first_name)}`,
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `Halfway there, ${ctx.client_first_name} \u{1F3C1}\n\n` +
                    `Week ${ctx.programme_week} of ${ctx.total_weeks} complete. That's no small thing \u{2014} a lot of people don't make it this far.\n\n` +
                    `Take a moment to recognise what you've put in. The second half is where the real results compound.\n\n` +
                    `${ctx.coach_first_name}`,
            }),
        },
    },
};

const milestoneCompletion: TemplateDefinition<MilestoneCompletionContext> = {
    id: TemplateId.MILESTONE_COMPLETION,
    description: "Programme completion celebration",
    channels: {
        telegram: {
            render: (ctx) => ({
                text:
                    `*${esc(ctx.offer_name)} \u{2014} done\\.* \u{1F389}\n\n` +
                    `${esc(ctx.client_first_name)}, ${ctx.total_weeks} weeks\\. You did the work\\.\n\n` +
                    `Final check\\-in coming shortly to close things out properly\\. And then let's talk about what's next\\.\n\n` +
                    `${esc(ctx.coach_first_name)}`,
                parseMode: "MarkdownV2",
            }),
        },
        whatsapp: {
            render: (ctx) => ({
                text:
                    `*${ctx.offer_name} \u{2014} complete.* \u{1F389}\n\n` +
                    `${ctx.client_first_name}, you did it. ${ctx.total_weeks} weeks in and you showed up when it counted.\n\n` +
                    `I'll be sending over a short final check-in to wrap up properly. Then we can talk about what comes next \u{2014} whether that's a new programme, maintenance, or just celebrating what you've built.\n\n` +
                    `Genuinely proud of the work you've put in.\n\n` +
                    `${ctx.coach_first_name}`,
            }),
        },
    },
};

registerTemplate(milestoneHalfway as TemplateDefinition);
registerTemplate(milestoneCompletion as TemplateDefinition);
