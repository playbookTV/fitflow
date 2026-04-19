/**
 * Meta WhatsApp Business API message template definitions.
 *
 * Each entry maps a FitFlow TemplateId to the Meta-approved template format:
 *   - metaName: registered template name on Meta (lowercase + underscores)
 *   - category: UTILITY (transactional) or MARKETING (re-engagement/promotional)
 *   - bodyText: template body with {{1}}, {{2}}… numbered placeholders
 *   - paramKeys: ordered context keys that fill those placeholders
 *
 * IMPORTANT: bodyText must match exactly what was submitted to Meta.
 * Meta rejects templates where variables appear at the start or end of the body,
 * so sign-offs use "Best, {{N}} — your coach" instead of bare "{{N}}".
 */

import { TemplateId } from "@fitflow/shared";

export interface MetaTemplateDefinition {
    metaName: string;
    category: "UTILITY" | "MARKETING";
    language: string;
    headerText?: string;
    bodyText: string;
    paramKeys: string[];
    /** WhatsApp Quick Reply button labels (max 3, each max 25 chars). */
    quickReplyButtons?: string[];
}

/**
 * Complete mapping from FitFlow TemplateId → Meta template definition.
 */
export const META_TEMPLATES: Record<TemplateId, MetaTemplateDefinition> = {
    // ── Lead & Intake ────────────────────────────────────────────
    [TemplateId.LEAD_ENQUIRY_RESPONSE]: {
        metaName: "fitflow_lead_enquiry_response",
        category: "UTILITY",
        language: "en",
        bodyText:
            "Hi {{1}} 👋\n\n" +
            "Thanks for reaching out about {{2}}. I'd love to get you started.\n\n" +
            "Here's your intake link — takes about 3 minutes to complete:\n{{3}}\n\n" +
            "Once I've reviewed your details, I'll be in touch to confirm your spot.\n\n" +
            "Best, {{4}} — your coach",
        paramKeys: ["client_first_name", "offer_name", "intake_link", "coach_first_name"],
    },
    [TemplateId.LEAD_PAYMENT_REQUEST]: {
        metaName: "fitflow_lead_payment_request",
        category: "UTILITY",
        language: "en",
        bodyText:
            "Hi {{1}},\n\n" +
            "Great news — you're a good fit for {{2}} and I'd love to work with you.\n\n" +
            "To secure your spot, complete your payment here:\n{{3}}\n\n" +
            "Once payment is confirmed, I'll activate your programme and send over everything you need to get started.\n\n" +
            "Any questions before you go ahead, just ask.\n\n" +
            "Best, {{4}} — your coach",
        paramKeys: ["client_first_name", "offer_name", "payment_link", "coach_first_name"],
    },
    [TemplateId.LEAD_PAYMENT_CONFIRMED]: {
        metaName: "fitflow_lead_payment_confirmed",
        category: "UTILITY",
        language: "en",
        bodyText:
            "Hey {{1}}, you're in! 🎉\n\n" +
            "Payment confirmed. Your {{2}} programme starts {{3}}.\n\n" +
            "Your onboarding will arrive shortly — please complete it before we kick off so I can personalise your plan.\n\n" +
            "Let's get to work.\n\n" +
            "Best, {{4}} — your coach",
        paramKeys: ["client_first_name", "offer_name", "programme_start_date", "coach_first_name"],
    },

    // ── Onboarding ───────────────────────────────────────────────
    [TemplateId.ONBOARDING_WELCOME]: {
        metaName: "fitflow_onboarding_welcome_v2",
        category: "UTILITY",
        language: "en",
        bodyText:
            "Welcome to {{1}}, {{2}}! 👊\n\n" +
            "Before your first session, I need a few details to build your plan. This takes about 5 minutes and happens right here in WhatsApp.\n\n" +
            "Hit the button below to get started 👇",
        paramKeys: ["offer_name", "client_first_name"],
    },
    [TemplateId.ONBOARDING_COMPLETE]: {
        metaName: "fitflow_onboarding_complete",
        category: "UTILITY",
        language: "en",
        bodyText:
            "That's everything I need, {{1}} — thanks for taking the time.\n\n" +
            "I'm building your personalised plan now. You'll receive your first workout on {{2}}.\n\n" +
            "In the meantime, here's what to expect:\n" +
            "• Workouts delivered here every morning\n" +
            "• Weekly check-in every {{3}}\n" +
            "• Message me anytime if something comes up\n\n" +
            "See you on {{2}} 💪\n\n" +
            "Best, {{4}} — your coach",
        paramKeys: ["client_first_name", "programme_start_date", "next_checkin_day", "coach_first_name"],
    },

    // ── Workout Delivery ─────────────────────────────────────────
    [TemplateId.WORKOUT_DAILY]: {
        metaName: "fitflow_workout_daily_v3",
        category: "UTILITY",
        language: "en",
        bodyText:
            "Day {{1}} — {{2}} 💪\n\n" +
            "{{3}}\n\n" +
            "How did it go?",
        paramKeys: ["workout_day_number", "workout_name", "exercise_list"],
        quickReplyButtons: ["✅ Done", "⏭ Skipped", "🔄 Modified"],
    },
    [TemplateId.WORKOUT_REST_DAY]: {
        metaName: "fitflow_workout_rest_day",
        category: "UTILITY",
        language: "en",
        bodyText:
            "Rest day today, {{1}} 🛌\n\n" +
            "Recovery is part of the programme — take it seriously. Stay hydrated, move gently if you can, and I'll see you tomorrow.\n\n" +
            "Best, {{2}} — your coach",
        paramKeys: ["client_first_name", "coach_first_name"],
    },
    [TemplateId.WORKOUT_WEEK_SUMMARY]: {
        metaName: "fitflow_workout_week_summary",
        category: "UTILITY",
        language: "en",
        headerText: "Weekly Summary",
        bodyText:
            "Week {{1}} of {{2}} — done. 📋\n\n" +
            "Here's how you did this week:\n\n" +
            "{{3}}\n\n" +
            "Your check-in is due tomorrow. I'll send it first thing. Keep the momentum going.\n\n" +
            "Best, {{4}} — your coach",
        paramKeys: ["programme_week", "total_weeks", "weekly_summary", "coach_first_name"],
    },
    [TemplateId.WORKOUT_LOGGED_CONFIRMATION]: {
        metaName: "fitflow_workout_logged_confirm_v2",
        category: "UTILITY",
        language: "en",
        bodyText:
            "🔥 Boom! Workout logged for Day {{1}}.\n\n" +
            "Great work, {{2}}! Your compliance is now {{3}}%. Keep it up! 🏋️",
        paramKeys: ["workout_day_number", "client_first_name", "compliance"],
    },

    // ── Check-ins ────────────────────────────────────────────────
    [TemplateId.CHECKIN_WEEKLY_PROMPT]: {
        metaName: "fitflow_checkin_weekly_prompt_v3",
        category: "UTILITY",
        language: "en",
        headerText: "Weekly Check-in",
        bodyText:
            "Check-in time, {{1}} 📋\n\n" +
            "Week {{2}} of {{3}}. Takes 2 minutes.",
        paramKeys: ["client_first_name", "programme_week", "total_weeks"],
        quickReplyButtons: ["✅ Start Check-in"],
    },
    [TemplateId.CHECKIN_COACH_ACK]: {
        metaName: "fitflow_checkin_coach_ack",
        category: "UTILITY",
        language: "en",
        bodyText:
            "Got your check-in, {{1}} — thanks for being consistent with this 🙏\n\n" +
            "I'll review it today and adjust anything that needs tweaking. Keep doing what you're doing.\n\n" +
            "Best, {{2}} — your coach",
        paramKeys: ["client_first_name", "coach_first_name"],
    },
    [TemplateId.CHECKIN_MISSED_NUDGE]: {
        metaName: "fitflow_checkin_missed_nudge_v3",
        category: "UTILITY",
        language: "en",
        bodyText:
            "Hey {{1}}, just a nudge — your week {{2}} check-in is still outstanding.\n\n" +
            "Only takes 2 minutes.",
        paramKeys: ["client_first_name", "programme_week"],
        quickReplyButtons: ["✅ Start Check-in"],
    },

    // ── At-Risk & Re-engagement ──────────────────────────────────
    [TemplateId.ATRISK_MISSED_WORKOUT]: {
        metaName: "fitflow_atrisk_missed_workout",
        category: "MARKETING",
        language: "en",
        bodyText:
            "No worries on today's session, {{1}} — life happens.\n\n" +
            "If something's come up or you need to adjust the schedule, just let me know. I'd rather know than have you fall off quietly.\n\n" +
            "Best, {{2}} — your coach",
        paramKeys: ["client_first_name", "coach_first_name"],
    },
    [TemplateId.ATRISK_THREE_PLUS]: {
        metaName: "fitflow_atrisk_three_plus",
        category: "MARKETING",
        language: "en",
        bodyText:
            "Hey {{1}}, I've noticed you've been quiet for a few days and a few sessions have slipped.\n\n" +
            "I'm not here to lecture — I just want to check in as your coach. Is everything okay? Has something changed that we should adjust for?\n\n" +
            "Even a quick reply helps me understand where you're at.\n\n" +
            "Best, {{2}} — your coach",
        paramKeys: ["client_first_name", "coach_first_name"],
    },
    [TemplateId.ATRISK_LAPSED]: {
        metaName: "fitflow_atrisk_lapsed",
        category: "MARKETING",
        language: "en",
        bodyText:
            "Hey {{1}},\n\n" +
            "It's been a while and I don't want to just quietly let your programme expire without reaching out properly.\n\n" +
            "If things have gotten in the way, that's completely understandable. If you want to pause, restart, or just have a conversation about what's realistic right now — I'm here for that.\n\n" +
            "No pressure either way, but the door's open.\n\n" +
            "Best, {{2}} — your coach",
        paramKeys: ["client_first_name", "coach_first_name"],
    },

    // ── Milestones ───────────────────────────────────────────────
    [TemplateId.MILESTONE_HALFWAY]: {
        metaName: "fitflow_milestone_halfway",
        category: "MARKETING",
        language: "en",
        bodyText:
            "Halfway there, {{1}} 🏁\n\n" +
            "Week {{2}} of {{3}} complete. That's no small thing — a lot of people don't make it this far.\n\n" +
            "Take a moment to recognise what you've put in. The second half is where the real results compound.\n\n" +
            "Best, {{4}} — your coach",
        paramKeys: ["client_first_name", "programme_week", "total_weeks", "coach_first_name"],
    },
    [TemplateId.MILESTONE_COMPLETION]: {
        metaName: "fitflow_milestone_completion",
        category: "MARKETING",
        language: "en",
        bodyText:
            "Programme complete — {{1}} 🎉\n\n" +
            "{{2}}, you did it. {{3}} weeks in and you showed up when it counted.\n\n" +
            "I'll be sending over a short final check-in to wrap up properly. Then we can talk about what comes next — whether that's a new programme, maintenance, or just celebrating what you've built.\n\n" +
            "Genuinely proud of the work you've put in.\n\n" +
            "Best, {{4}} — your coach",
        paramKeys: ["offer_name", "client_first_name", "total_weeks", "coach_first_name"],
    },

    // ── Payments ─────────────────────────────────────────────────
    [TemplateId.PAYMENT_REMINDER]: {
        metaName: "fitflow_payment_reminder",
        category: "UTILITY",
        language: "en",
        bodyText:
            "Hey {{1}},\n\n" +
            "Just a friendly reminder about your outstanding payment of {{2}}.\n\n" +
            "You can pay here when you're ready:\n{{3}}\n\n" +
            "Let me know if you have any questions.\n\n" +
            "Best, {{4}} — your coach",
        paramKeys: ["client_first_name", "amount", "payment_link", "coach_first_name"],
    },

    // ── Renewals ─────────────────────────────────────────────────
    [TemplateId.RENEWAL_7DAY]: {
        metaName: "fitflow_renewal_7day",
        category: "MARKETING",
        language: "en",
        bodyText:
            "Hey {{1}},\n\n" +
            "Your current programme expires on {{2}} — that's 7 days away.\n\n" +
            "If you'd like to continue, here's your renewal link:\n{{3}}\n\n" +
            "Renewing keeps your history, your plan, and your momentum intact. Happy to chat through what the next phase looks like if you're unsure.\n\n" +
            "Best, {{4}} — your coach",
        paramKeys: ["client_first_name", "renewal_date", "payment_link", "coach_first_name"],
    },
    [TemplateId.RENEWAL_2DAY]: {
        metaName: "fitflow_renewal_2day",
        category: "MARKETING",
        language: "en",
        bodyText:
            "Hey {{1}} — quick heads up, your programme ends in 2 days on {{2}}.\n\n" +
            "If you're continuing, now's the time to sort it so there's no break in your delivery:\n{{3}}\n\n" +
            "If you're taking a break, no problem — just let me know so I can pause things cleanly.\n\n" +
            "Best, {{4}} — your coach",
        paramKeys: ["client_first_name", "renewal_date", "payment_link", "coach_first_name"],
    },
    [TemplateId.RENEWAL_POST_EXPIRY]: {
        metaName: "fitflow_renewal_post_expiry",
        category: "MARKETING",
        language: "en",
        bodyText:
            "Hey {{1}},\n\n" +
            "Your programme ended on {{2}} and I haven't heard from you — wanted to reach out before too much time passes.\n\n" +
            "If you're ready to jump back in, I can get you reactivated quickly:\n{{3}}\n\n" +
            "If the timing isn't right, that's okay too. Just let me know either way.\n\n" +
            "Best, {{4}} — your coach",
        paramKeys: ["client_first_name", "renewal_date", "payment_link", "coach_first_name"],
    },

    // ── Meal Delivery ─────────────────────────────────────────────
    [TemplateId.MEAL_DAILY]: {
        metaName: "fitflow_meal_daily_v3",
        category: "UTILITY",
        language: "en",
        bodyText:
            "Hey {{1}}, here's your plan for today.\n\n" +
            "Day {{2}} 🍽️\n" +
            "{{3}}\n\n" +
            "{{4}}\n\n" +
            "📊 Daily Totals\n" +
            "Protein: {{5}}g | Carbs: {{6}}g | Fat: {{7}}g | Calories: {{8}}\n\n" +
            "How did it go?",
        paramKeys: ["client_first_name", "day_number", "plan_title", "meals_list", "protein", "carbs", "fat", "calories"],
        quickReplyButtons: ["✅ Done", "⏭ Skipped"],
    },
    [TemplateId.MEAL_REST_DAY]: {
        metaName: "fitflow_meal_rest_day",
        category: "UTILITY",
        language: "en",
        bodyText:
            "No structured meals today, {{1}} 🍃\n\n" +
            "Keep your protein up and stay hydrated. If you need ideas, check your plan in the dashboard — yesterday's meals work well as a repeat.\n\n" +
            "Best, {{2}} — your coach",
        paramKeys: ["client_first_name", "coach_first_name"],
    },
    [TemplateId.MEAL_LOGGED_CONFIRMATION]: {
        metaName: "fitflow_meal_logged_confirm_v2",
        category: "UTILITY",
        language: "en",
        bodyText:
            "🙌 Meal plan logged for Day {{1}}.\n\n" +
            "Nice work, {{2}}! Your meal compliance is now {{3}}%. Keep it up! 🥗",
        paramKeys: ["day_number", "client_first_name", "compliance"],
    },
    [TemplateId.MEAL_MISSED_NUDGE]: {
        metaName: "fitflow_meal_missed_nudge_v3",
        category: "UTILITY",
        language: "en",
        bodyText:
            "Hey {{1}}, quick reminder — did you follow yesterday's meal plan? (Day {{2}}, {{3}})\n\n" +
            "Even a rough log helps your coach keep your nutrition on track.",
        paramKeys: ["client_first_name", "day_number", "plan_title"],
        quickReplyButtons: ["✅ Done", "⏭ Skipped"],
    },

    // ── Exercise Videos ──────────────────────────────────────────
    [TemplateId.EXERCISE_VIDEO]: {
        metaName: "fitflow_exercise_video",
        category: "UTILITY",
        language: "en",
        bodyText:
            "Exercise demo: {{1}}\n\n" +
            "{{2}}\n\n" +
            "Watch the video above and follow the form cues. Reach out if anything is unclear.",
        paramKeys: ["exercise_name", "_exercise_details"],
    },

    // ── System & Admin ───────────────────────────────────────────
    [TemplateId.SYSTEM_BANK_DETAILS]: {
        metaName: "fitflow_system_bank_details",
        category: "UTILITY",
        language: "en",
        bodyText:
            "Hi {{1}},\n\n" +
            "Here are the bank transfer details for {{2}}:\n\n" +
            "{{3}}\n\n" +
            "Please use your name as the reference. Once I've received payment I'll confirm and get your programme set up straight away.\n\n" +
            "Best, {{4}} — your coach",
        paramKeys: ["client_first_name", "offer_name", "bank_transfer_details", "coach_first_name"],
    },
    [TemplateId.SYSTEM_BANK_CONFIRMED]: {
        metaName: "fitflow_system_bank_confirmed",
        category: "UTILITY",
        language: "en",
        bodyText:
            "Payment received, {{1}} — thank you 🙏\n\n" +
            "I'm activating your programme now. Your onboarding will arrive shortly.\n\n" +
            "Best, {{2}} — your coach",
        paramKeys: ["client_first_name", "coach_first_name"],
    },
    [TemplateId.SYSTEM_BROADCAST]: {
        metaName: "fitflow_system_broadcast",
        category: "MARKETING",
        language: "en",
        bodyText:
            "Hey {{1}},\n\n" +
            "{{2}}\n\n" +
            "If you have any questions, just reply to this message.\n\n" +
            "Best, {{3}} — your coach",
        paramKeys: ["client_first_name", "broadcast_message", "coach_first_name"],
    },
};

/**
 * Build the Meta API payload for CREATING a message template.
 * POST /{WABA_ID}/message_templates
 */
export function buildCreatePayload(templateId: TemplateId) {
    const def = META_TEMPLATES[templateId];
    const components: any[] = [];

    if (def.headerText) {
        components.push({ type: "HEADER", format: "TEXT", text: def.headerText });
    }
    components.push({ type: "BODY", text: def.bodyText });

    if (def.quickReplyButtons) {
        components.push({
            type: "BUTTONS",
            buttons: def.quickReplyButtons.map((text) => ({
                type: "QUICK_REPLY",
                text,
            })),
        });
    }

    return {
        name: def.metaName,
        language: def.language,
        category: def.category,
        components,
    };
}

/**
 * Build the Meta API payload for SENDING a message template.
 * Passed as the template object to sendWhatsAppMessage().
 */
export function buildSendPayload(templateId: TemplateId, context: Record<string, any>) {
    const def = META_TEMPLATES[templateId];

    const parameters = def.paramKeys.map((key) => {
        // Special computed key for exercise details
        if (key === "_exercise_details") {
            return {
                type: "text" as const,
                text: buildExerciseDetails(context),
            };
        }
        return {
            type: "text" as const,
            text: String(context[key] ?? ""),
        };
    });

    const components: any[] = [];

    if (def.headerText) {
        components.push({ type: "header" });
    }
    components.push({ type: "body", parameters });

    if (def.quickReplyButtons) {
        def.quickReplyButtons.forEach((_, index) => {
            components.push({
                type: "button",
                sub_type: "quick_reply",
                index: String(index),
                parameters: [{ type: "payload", payload: `${templateId}:${index}` }],
            });
        });
    }

    return {
        name: def.metaName,
        language: { code: def.language },
        components,
    };
}

/**
 * Returns the Meta template category for a given FitFlow TemplateId.
 * MARKETING templates can be sent outside the 24-hour customer service window.
 */
export function getTemplateCategory(templateId: TemplateId): "UTILITY" | "MARKETING" {
    return META_TEMPLATES[templateId].category;
}

/**
 * Build the exercise details string from conditional context fields.
 * Handles the dynamic nature of the EXERCISE_VIDEO template.
 */
function buildExerciseDetails(ctx: Record<string, any>): string {
    const lines: string[] = [];
    if (ctx.muscle_group) lines.push(`💪 ${ctx.muscle_group}`);
    if (ctx.sets != null && ctx.reps) {
        lines.push(`📋 ${ctx.sets} × ${ctx.reps} reps`);
    } else if (ctx.sets != null) {
        lines.push(`📋 ${ctx.sets} sets`);
    }
    if (ctx.instructions) lines.push(`\n${ctx.instructions}`);
    return lines.join("\n");
}
