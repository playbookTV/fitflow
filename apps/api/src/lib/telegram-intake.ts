import { Lead, MessageChannel } from "@prisma/client";
import { prisma } from "./prisma";
import { sendTelegramMessage, sendTelegramInlineKeyboard } from "./telegram";
import { escapeMarkdownV2Url } from "./templates/escape";
import { createCheckoutSession } from "./stripe";
import { logEvent, EventType } from "./event-logger";

// ── Types ──────────────────────────────────────────────────────────────────

type IntakeStep = "name" | "age" | "gender" | "goal" | "weight" | "agreement" | "chat" | "complete";

interface IntakeData {
    step: IntakeStep;
    name?: string;
    age?: number;
    gender?: string;
    goal?: string;
    weight?: string;
    agreedToTerms?: boolean;
}

// Callback data prefixes for inline keyboard buttons
const CB = {
    WELCOME_QUESTIONS: "intake_start",
    WELCOME_CHAT: "intake_chat",
    GENDER_PREFIX: "intake_gender_",
    GOAL_PREFIX: "intake_goal_",
    AGREEMENT: "intake_agree",
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────

function getIntakeData(lead: Lead): IntakeData | null {
    if (!lead.intakeData) return null;
    return lead.intakeData as unknown as IntakeData;
}

function nextStep(current: IntakeStep): IntakeStep {
    const order: IntakeStep[] = ["name", "age", "gender", "goal", "weight", "agreement", "complete"];
    const idx = order.indexOf(current);
    return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : "complete";
}

async function updateIntake(leadId: string, data: Partial<IntakeData>): Promise<void> {
    await prisma.$transaction(async (tx) => {
        const lead = await tx.lead.findUnique({ where: { id: leadId } });
        const current = (lead?.intakeData as unknown as IntakeData) || { step: "name" };
        await tx.lead.update({
            where: { id: leadId },
            data: { intakeData: { ...current, ...data } as any },
        });
    });
}

async function sendStepPrompt(
    botToken: string,
    chatId: string,
    step: IntakeStep,
    intake: IntakeData,
    coachName: string,
    offerName?: string
): Promise<void> {
    switch (step) {
        case "name":
            await sendTelegramMessage(botToken, chatId, "Great! Let's get you set up. What's your first name?");
            break;

        case "age":
            await sendTelegramMessage(
                botToken,
                chatId,
                `Nice to meet you, ${intake.name}! How old are you?`
            );
            break;

        case "gender":
            await sendTelegramInlineKeyboard(
                botToken,
                chatId,
                "Got it\\! What's your gender?",
                [
                    [
                        { text: "Male", callback_data: `${CB.GENDER_PREFIX}Male` },
                        { text: "Female", callback_data: `${CB.GENDER_PREFIX}Female` },
                        { text: "Other", callback_data: `${CB.GENDER_PREFIX}Other` },
                    ],
                ]
            );
            break;

        case "goal":
            await sendTelegramInlineKeyboard(
                botToken,
                chatId,
                "Almost there\\! What's your main fitness goal?",
                [
                    [
                        { text: "\u{1F4AA} Muscle Gain", callback_data: `${CB.GOAL_PREFIX}Muscle Gain` },
                        { text: "\u{1F525} Weight Loss", callback_data: `${CB.GOAL_PREFIX}Weight Loss` },
                    ],
                    [
                        { text: "\u{1F3C3} General Fitness", callback_data: `${CB.GOAL_PREFIX}General Fitness` },
                        { text: "\u{2728} Other", callback_data: `${CB.GOAL_PREFIX}Other` },
                    ],
                ]
            );
            break;

        case "weight":
            await sendTelegramMessage(
                botToken,
                chatId,
                "Last one \u{2014} what's your current weight? (e.g. 75kg or 165lbs)"
            );
            break;

        case "agreement": {
            const programme = offerName || "coaching programme";
            const termsUrl = `${process.env.WEB_URL || ""}/terms`;
            await sendTelegramInlineKeyboard(
                botToken,
                chatId,
                `Here's what you're signing up for:\n\n` +
                    `\u{1F4CB} *${escMd(programme)}* with ${escMd(coachName)}\n\n` +
                    `By continuing, you agree to the [coaching terms & conditions](${escapeMarkdownV2Url(termsUrl)})\\.\n\n` +
                    `Ready to proceed to payment?`,
                [[{ text: "\u{2705} I Agree & Continue to Payment", callback_data: CB.AGREEMENT }]],
            );
            break;
        }
    }
}

// Minimal MarkdownV2 escape for dynamic values
function escMd(text: string): string {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Called after lead creation from /start command.
 * Sends welcome message with [Answer Questions] / [Speak with Coach] buttons.
 */
export async function startIntakeFlow(
    lead: Lead,
    botToken: string,
    coachName: string
): Promise<void> {
    await updateIntake(lead.id, { step: "name" });

    await sendTelegramInlineKeyboard(
        botToken,
        lead.telegramChatId!,
        `\u{1F44B} Welcome to ${escMd(coachName)}'s coaching programme\\!\n\nWhat would you like to do?`,
        [
            [{ text: "\u{1F4DD} Answer Questions", callback_data: CB.WELCOME_QUESTIONS }],
            [{ text: "\u{1F4AC} Speak with Coach", callback_data: CB.WELCOME_CHAT }],
        ]
    );
}

/**
 * Handles inbound text messages from a lead during the intake flow.
 * Returns true if the message was consumed by the intake flow.
 */
export async function handleIntakeMessage(
    lead: Lead,
    text: string,
    botToken: string,
    coachName: string
): Promise<boolean> {
    const intake = getIntakeData(lead);

    // No intake started, or complete, or in chat mode — don't consume
    if (!intake || intake.step === "complete" || intake.step === "chat") {
        return false;
    }

    // Steps that expect inline keyboard presses, not free text
    if (intake.step === "gender" || intake.step === "goal" || intake.step === "agreement") {
        await sendTelegramMessage(
            botToken,
            lead.telegramChatId!,
            "Please use the buttons above to select your answer \u{1F446}"
        );
        return true;
    }

    // Validate and process the current step
    switch (intake.step) {
        case "name": {
            const name = text.trim();
            if (!name || name.length > 50) {
                await sendTelegramMessage(botToken, lead.telegramChatId!, "Please enter your first name.");
                return true;
            }
            await sendStepPrompt(botToken, lead.telegramChatId!, "age", { ...intake, name }, coachName);
            await updateIntake(lead.id, { step: "age", name });
            await prisma.lead.update({ where: { id: lead.id }, data: { name } });
            return true;
        }

        case "age": {
            const age = parseInt(text.trim(), 10);
            if (isNaN(age) || age < 13 || age > 99) {
                await sendTelegramMessage(
                    botToken,
                    lead.telegramChatId!,
                    "Please enter a valid age (13\u{2013}99)."
                );
                return true;
            }
            await sendStepPrompt(botToken, lead.telegramChatId!, "gender", { ...intake, age }, coachName);
            await updateIntake(lead.id, { step: "gender", age });
            return true;
        }

        case "weight": {
            const weight = text.trim();
            if (!weight || weight.length > 20) {
                await sendTelegramMessage(
                    botToken,
                    lead.telegramChatId!,
                    "Please enter your weight (e.g. 75kg or 165lbs)."
                );
                return true;
            }
            // Fetch offer name for agreement step
            const freshLead = await prisma.lead.findUnique({
                where: { id: lead.id },
                include: { offer: { select: { name: true } } },
            });
            const offerName = freshLead?.offer?.name;

            await sendStepPrompt(
                botToken,
                lead.telegramChatId!,
                "agreement",
                { ...intake, weight },
                coachName,
                offerName || undefined
            );
            await updateIntake(lead.id, { step: "agreement", weight });
            return true;
        }
    }

    return false;
}

/**
 * Handles inline keyboard callback queries from a lead during intake.
 * Returns true if the callback was consumed by the intake flow.
 */
export async function handleIntakeCallback(
    lead: Lead,
    callbackData: string,
    chatId: string,
    botToken: string,
    coachName: string
): Promise<boolean> {
    const intake = getIntakeData(lead);

    // Welcome buttons — these work even before intake data exists
    if (callbackData === CB.WELCOME_QUESTIONS) {
        await sendStepPrompt(botToken, chatId, "name", intake || { step: "name" }, coachName);
        return true;
    }

    if (callbackData === CB.WELCOME_CHAT) {
        await updateIntake(lead.id, { step: "chat" });
        await sendTelegramMessage(
            botToken,
            chatId,
            `No problem! Send your message and ${coachName} will get back to you soon.`
        );
        return true;
    }

    if (!intake || intake.step === "complete" || intake.step === "chat") {
        return false;
    }

    // Gender selection
    if (callbackData.startsWith(CB.GENDER_PREFIX) && intake.step === "gender") {
        const gender = callbackData.replace(CB.GENDER_PREFIX, "");
        await sendStepPrompt(botToken, chatId, "goal", { ...intake, gender }, coachName);
        await updateIntake(lead.id, { step: "goal", gender });
        return true;
    }

    // Goal selection
    if (callbackData.startsWith(CB.GOAL_PREFIX) && intake.step === "goal") {
        const goal = callbackData.replace(CB.GOAL_PREFIX, "");
        await sendStepPrompt(botToken, chatId, "weight", { ...intake, goal }, coachName);
        await updateIntake(lead.id, { step: "weight", goal });
        return true;
    }

    // Agreement acceptance — triggers auto-conversion + payment
    if (callbackData === CB.AGREEMENT && intake.step === "agreement") {
        await updateIntake(lead.id, { step: "complete", agreedToTerms: true });
        await prisma.lead.update({ where: { id: lead.id }, data: { status: "INTAKE_COMPLETE" } });

        await logEvent(EventType.LEAD_INTAKE_COMPLETE, {
            coachId: lead.coachId,
            channel: MessageChannel.TELEGRAM,
            metadata: { leadId: lead.id },
        });

        // Auto-convert lead to client
        try {
            const client = await convertLeadToClient(lead.id, lead.coachId);

            // Fetch coach data for Stripe Connect and pricing
            const coach = await prisma.coach.findUnique({
                where: { id: lead.coachId },
                select: { stripeAccountId: true, defaultMonthlyRate: true, billingCurrency: true },
            });

            // Generate Stripe checkout and send payment link (only if coach has Stripe connected and a rate set)
            const amountCents = client.monthlyRate ?? coach?.defaultMonthlyRate;
            if (!coach?.stripeAccountId || !amountCents) {
                console.warn(`[TG Intake] Skipping payment link — coach ${lead.coachId} missing Stripe account or rate`);
                // Still log the conversion below, just skip the payment link
            }

            const webUrl = process.env.WEB_URL || "http://localhost:3000";
            const session = coach?.stripeAccountId && amountCents
                ? await createCheckoutSession(
                    client.id,
                    lead.coachId,
                    coach.stripeAccountId,
                    amountCents,
                    coach.billingCurrency || "gbp",
                    `${webUrl}/pay/success`,
                    `${webUrl}/pay/cancel`
                )
                : null;

            const freshLead = await prisma.lead.findUnique({
                where: { id: lead.id },
                include: { offer: { select: { name: true } } },
            });
            const offerName = freshLead?.offer?.name || "coaching programme";

            if (session?.url) {
                await sendTelegramMessage(
                    botToken,
                    chatId,
                    `\u{2705} You're all set, ${intake.name}!\n\n` +
                        `Complete your payment to secure your spot on ${offerName}:\n\n` +
                        `${session.url}\n\n` +
                        `${coachName} will activate your programme as soon as payment goes through. \u{1F680}`
                );
            } else {
                await sendTelegramMessage(
                    botToken,
                    chatId,
                    `\u{2705} You're all set, ${intake.name}!\n\n` +
                        `${coachName} will be in touch shortly to get you started on ${offerName}. \u{1F680}`
                );
            }

            await logEvent(EventType.LEAD_CONVERTED, {
                coachId: lead.coachId,
                clientId: client.id,
                channel: MessageChannel.TELEGRAM,
                metadata: { leadId: lead.id, source: lead.source },
            });
        } catch (error) {
            console.error(`[Intake] Auto-conversion/payment failed for lead ${lead.id}:`, error);
            await sendTelegramMessage(
                botToken,
                chatId,
                `Thanks for completing your intake! ${coachName} will follow up with payment details shortly.`
            );
        }

        return true;
    }

    return false;
}

/**
 * Resumes the intake flow for a lead that has already started.
 * Called when a lead sends /start again mid-flow.
 */
export async function resumeIntakeFlow(
    lead: Lead,
    botToken: string,
    coachName: string
): Promise<void> {
    const intake = getIntakeData(lead);
    if (!intake || intake.step === "complete") return;

    if (intake.step === "chat") {
        await sendTelegramMessage(
            botToken,
            lead.telegramChatId!,
            `\u{1F44B} Welcome back! You're connected with ${coachName}. Send a message any time.`
        );
        return;
    }

    // Fetch offer for agreement step
    const freshLead = await prisma.lead.findUnique({
        where: { id: lead.id },
        include: { offer: { select: { name: true } } },
    });

    await sendTelegramMessage(
        botToken,
        lead.telegramChatId!,
        "Welcome back! Let's pick up where we left off."
    );
    await sendStepPrompt(
        botToken,
        lead.telegramChatId!,
        intake.step,
        intake,
        coachName,
        freshLead?.offer?.name || undefined
    );
}

// ── Lead-to-Client Conversion ──────────────────────────────────────────────

/**
 * Converts a lead to a client, transferring messages and enriching with intake data.
 * Reusable by both the automated intake flow and the manual API endpoint.
 */
export async function convertLeadToClient(leadId: string, coachId: string) {
    const client = await prisma.$transaction(async (tx) => {
        const lead = await tx.lead.findFirst({ where: { id: leadId, coachId } });
        if (!lead) throw new Error(`Lead ${leadId} not found`);
        if (lead.status === "CONVERTED") throw new Error(`Lead ${leadId} already converted`);

        const intake = (lead.intakeData as unknown as IntakeData) || {};

        const newClient = await tx.client.create({
            data: {
                coachId,
                name: lead.name,
                phone: lead.phone,
                email: lead.email,
                telegramChatId: lead.telegramChatId,
                preferredChannel: lead.channelTag,
                status: "PENDING_PAYMENT",
                goals: intake.goal || null,
                notes: intake.age || intake.gender || intake.weight
                    ? `Age: ${intake.age || "\u2014"} | Gender: ${intake.gender || "\u2014"} | Weight: ${intake.weight || "\u2014"}`
                    : null,
            },
        });

        await tx.message.updateMany({
            where: { leadId },
            data: { clientId: newClient.id, leadId: null },
        });

        await tx.lead.update({
            where: { id: leadId },
            data: { status: "CONVERTED" },
        });

        return newClient;
    });

    return client;
}
