import { Worker, Job } from "bullmq";
import { prisma } from "../lib/prisma";
import { getChannel, getRecipientId } from "../lib/channels/channel-router";
import { connection } from "../lib/queue";
import { JobType } from "../lib/types";
import { logEvent, EventType } from "../lib/event-logger";
import { TemplateId } from "@fitflow/shared";
import { differenceInDays, differenceInWeeks } from "date-fns";
import { getFreshVideoUrl } from "../services/exerciseCache";
import { assertSendSuccess } from "./assert-send";
import { handleCommand } from "./commands";

// Ensure all templates are registered
import "../lib/templates";

/**
 * Worker to process workout delivery.
 */
export const workoutWorker = new Worker(
    "workout-delivery",
    async (job: Job) => {
        const { clientId, dayNumber, assignmentId } = job.data;

        console.log(`[Worker] Processing job ${job.name} for client ${clientId}`);

        try {
            if (job.name === JobType.WORKOUT_DELIVERY) {
                const assignment = await prisma.planAssignment.findUnique({
                    where: { id: assignmentId },
                    include: {
                        plan: {
                            include: {
                                days: {
                                    include: {
                                        exercises: {
                                            include: { exercise: true },
                                            orderBy: { order: "asc" },
                                        },
                                    },
                                },
                            },
                        },
                        client: {
                            include: { coach: true },
                        },
                    },
                });

                if (!assignment?.isActive) {
                    console.log(`[Worker] Assignment ${assignmentId} is inactive or missing. Skipping.`);
                    return;
                }

                const { client } = assignment;
                const channel = await getChannel(client.preferredChannel, client.coachId);
                const recipientId = getRecipientId(client);
                const workoutDay = (dayNumber % 7) || 7;

                // Find the matching WorkoutDay for this day number
                const matchingDay = assignment.plan.days.find(d => d.dayNumber === workoutDay);
                const workoutName = matchingDay?.title || assignment.plan.title;

                // Build exercise list string
                let exerciseList = "Check your dashboard for today's exercises.";
                if (matchingDay?.exercises && matchingDay.exercises.length > 0) {
                    exerciseList = matchingDay.exercises
                        .map((we, i) => {
                            const parts = [`${i + 1}. ${we.exercise.name}`];
                            if (we.sets && we.reps) parts.push(`${we.sets} sets x ${we.reps} reps`);
                            else if (we.sets) parts.push(`${we.sets} sets`);
                            if (we.notes) parts.push(we.notes);
                            return parts.join(" — ");
                        })
                        .join(" | ");
                }

                const result = await channel.sendTemplate(recipientId, TemplateId.WORKOUT_DAILY, {
                    workout_day_number: workoutDay,
                    workout_name: workoutName,
                    exercise_list: exerciseList,
                    clientId: client.id,
                });
                assertSendSuccess(result, `Workout delivery for client ${client.id}`);

                // Send demo videos for exercises that have YMove IDs
                let videosFailed = 0;
                if (matchingDay?.exercises && channel.sendVideo) {
                    const ymoveExercises = matchingDay.exercises.filter(
                        (we) => we.exercise.ymoveId
                    );

                    for (const we of ymoveExercises) {
                        try {
                            const { videoUrl } = await getFreshVideoUrl(we.exercise.ymoveId!);
                            const caption = [
                                `*${we.exercise.name}*`,
                                we.sets && we.reps ? `${we.sets} \u00D7 ${we.reps} reps` : null,
                                we.notes || null,
                            ]
                                .filter(Boolean)
                                .join("\n");

                            const result = await channel.sendVideo(recipientId, {
                                videoUrl,
                                caption,
                                clientId: client.id,
                            });
                            if (!result.success) {
                                throw new Error(
                                    `Failed to send exercise video via ${client.preferredChannel}: ${result.error || "unknown error"}`
                                );
                            }
                        } catch (err) {
                            videosFailed++;
                            console.error(
                                `[Workout Worker] Failed to send video for exercise ${we.exercise.name}:`,
                                err
                            );
                        }
                    }
                }

                await logEvent(EventType.WORKOUT_DELIVERED, {
                    coachId: client.coachId,
                    clientId: client.id,
                    channel: client.preferredChannel,
                    metadata: { planTitle: assignment.plan.title, dayNumber: workoutDay, videosFailed },
                });
            }
        } catch (error) {
            console.error(`[Workout Worker] Error processing job ${job.id}:`, error);
            throw error;
        }
    },
    { connection }
);

/**
 * Worker to process check-in reminders.
 */
export const checkinWorker = new Worker(
    "checkin-reminders",
    async (job: Job) => {
        const { clientId } = job.data;
        console.log(`[Checkin Worker] Sending reminder to ${clientId}`);

        try {
            const client = await prisma.client.findUnique({
                where: { id: clientId },
                include: { coach: true },
            });
            if (!client) return;

            const channel = await getChannel(client.preferredChannel, client.coachId);
            const recipientId = getRecipientId(client);

            // Calculate programme week from active assignment
            const assignment = await prisma.planAssignment.findFirst({
                where: { clientId, isActive: true },
                include: { plan: { include: { days: true } } },
            });

            const programmeWeek = assignment
                ? differenceInWeeks(new Date(), assignment.startDate) + 1
                : 1;
            const totalWeeks = assignment
                ? Math.ceil(assignment.plan.days.length / assignment.scheduleDays.length)
                : 12;

            const result = await channel.sendTemplate(recipientId, TemplateId.CHECKIN_WEEKLY_PROMPT, {
                client_first_name: client.name.split(" ")[0],
                programme_week: programmeWeek,
                total_weeks: totalWeeks,
                clientId: client.id,
            });

            assertSendSuccess(result, `Check-in reminder for client ${clientId} via ${client.preferredChannel}`);

            await logEvent(EventType.CHECKIN_SENT, {
                coachId: client.coachId,
                clientId: client.id,
                channel: client.preferredChannel,
            });
        } catch (error) {
            console.error(`[Checkin Worker] Error processing job ${job.id}:`, error);
            throw error;
        }
    },
    { connection }
);

/**
 * Worker to process onboarding intake flows.
 */
export const onboardingWorker = new Worker(
    "onboarding-intake",
    async (job: Job) => {
        const { clientId } = job.data;
        console.log(`[Onboarding Worker] Processing job ${job.name} for ${clientId}`);

        const client = await prisma.client.findUnique({
            where: { id: clientId },
            include: { coach: true },
        });
        if (!client) return;

        const channel = await getChannel(client.preferredChannel, client.coachId);
        const recipientId = getRecipientId(client);

        if (job.name === JobType.ONBOARDING_INTAKE) {
            const offerName = client.goals || `${client.coach?.name ?? "Your coach"}'s Coaching`;

            const welcomeResult = await channel.sendTemplate(recipientId, TemplateId.ONBOARDING_WELCOME, {
                client_first_name: client.name.split(" ")[0],
                offer_name: offerName,
                clientId: client.id,
            });
            assertSendSuccess(welcomeResult, `Onboarding welcome for client ${clientId}`);

            await logEvent(EventType.ONBOARDING_SENT, {
                coachId: client.coachId,
                clientId: client.id,
                channel: client.preferredChannel,
            });
        } else if (job.name === JobType.PAYMENT_CONFIRMED) {
            const coachFirstName = client.coach?.name?.split(" ")[0] || "Your coach";
            const offerName = job.data.offerName || client.goals || `${client.coach?.name ?? "Your coach"}'s Coaching`;
            const programmeStartDate = job.data.programmeStartDate || "soon";

            const confirmResult = await channel.sendTemplate(recipientId, TemplateId.LEAD_PAYMENT_CONFIRMED, {
                client_first_name: client.name.split(" ")[0],
                coach_first_name: coachFirstName,
                offer_name: offerName,
                programme_start_date: programmeStartDate,
            });
            assertSendSuccess(confirmResult, `Payment confirmed for client ${clientId}`);

            await logEvent(EventType.PAYMENT_CONFIRMED, {
                coachId: client.coachId,
                clientId: client.id,
                channel: client.preferredChannel,
                metadata: { templateSent: true },
            });
        }
    },
    { connection }
);

/**
 * Worker to process renewal reminders.
 */
export const renewalWorker = new Worker(
    "renewal-reminders",
    async (job: Job) => {
        const { clientId, planTitle, daysUntilRenewal } = job.data;
        console.log(`[Renewal Worker] Sending reminder to ${clientId}`);

        const client = await prisma.client.findUnique({
            where: { id: clientId },
            include: { coach: true },
        });
        if (!client) return;

        const channel = await getChannel(client.preferredChannel, client.coachId);
        const recipientId = getRecipientId(client);
        const coachFirstName = client.coach?.name?.split(" ")[0] || "Your coach";

        // Calculate renewal date
        const renewalDate = new Date();
        renewalDate.setDate(renewalDate.getDate() + (daysUntilRenewal || 0));
        const renewalDateStr = renewalDate.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
        });

        const paymentLink = `${process.env.WEB_URL}/pay/${client.coachId}/${clientId}`;

        // Choose template based on job name or days until renewal
        let templateId: TemplateId;
        if (job.name === JobType.RENEWAL_POST_EXPIRY || daysUntilRenewal <= 0) {
            templateId = TemplateId.RENEWAL_POST_EXPIRY;
        } else if (daysUntilRenewal <= 2) {
            templateId = TemplateId.RENEWAL_2DAY;
        } else {
            templateId = TemplateId.RENEWAL_7DAY;
        }

        const renewalResult = await channel.sendTemplate(recipientId, templateId, {
            client_first_name: client.name.split(" ")[0],
            coach_first_name: coachFirstName,
            renewal_date: renewalDateStr,
            payment_link: paymentLink,
            renewal_amount: job.data.renewalAmount || "",
        });
        assertSendSuccess(renewalResult, `Renewal reminder (${templateId}) for client ${clientId}`);

        await logEvent(EventType.CHECKIN_SENT, {
            coachId: client.coachId,
            clientId: client.id,
            channel: client.preferredChannel,
            metadata: { type: "renewal_reminder", planTitle, daysUntilRenewal, templateId },
        });
    },
    { connection }
);

workoutWorker.on("completed", (job) => console.log(`[Workout Worker] Job ${job.id} completed`));
checkinWorker.on("completed", (job) => console.log(`[Checkin Worker] Job ${job.id} completed`));
onboardingWorker.on("completed", (job) => console.log(`[Onboarding Worker] Job ${job.id} completed`));
renewalWorker.on("completed", (job) => console.log(`[Renewal Worker] Job ${job.id} completed`));

/**
 * Worker to process incoming messages (Conversational Logging).
 * Handles "DONE" keyword from WhatsApp text messages.
 * Telegram uses inline keyboard callbacks handled in the Telegram webhook route.
 *
 * Uses its own dedicated "message-processing" queue so BullMQ never dispatches
 * a WORKOUT_DELIVERY job to this worker (or vice versa).
 */
export const messageWorker = new Worker(
    "message-processing", // Dedicated queue — previously incorrectly shared "workout-delivery"
    async (job: Job) => {
        if (job.name !== "process-message") return;

        const { clientId, body, channel: jobChannel } = job.data;
        const normalizedBody = body.trim().toUpperCase();

        console.log(`[Message Worker] Processing message from ${clientId}: ${body}`);

        // Try command router first (HELP, PROGRESS, WEIGHT, RPE)
        const commandResponse = await handleCommand(normalizedBody, clientId, job.data.coachId, jobChannel);
        if (commandResponse !== null) {
            const cmdClient = await prisma.client.findUnique({
                where: { id: clientId },
                include: { coach: true },
            });
            if (cmdClient) {
                const cmdChannel = await getChannel(cmdClient.preferredChannel, cmdClient.coachId);
                const cmdRecipientId = getRecipientId(cmdClient);
                const result = await cmdChannel.sendMessage(cmdRecipientId, commandResponse, cmdClient.id);
                if (!result.success) {
                    console.warn(`[Message Worker] Command response failed for ${clientId}: ${result.error}`);
                }
            }
            return;
        }

        // Existing DONE/SKIP handling
        const isDone = normalizedBody === "DONE";
        const isSkipped = normalizedBody === "SKIP" || normalizedBody === "SKIPPED";

        if (!isDone && !isSkipped) return;

        const assignment = await prisma.planAssignment.findFirst({
            where: { clientId, isActive: true },
            include: { client: { include: { coach: true } } },
        });

        if (!assignment) {
            console.log(`[Message Worker] No active assignment for client ${clientId}`);
            return;
        }

        const status = isDone ? "COMPLETED" : "SKIPPED";
        const dayNumber = differenceInDays(new Date(), assignment.startDate) + 1;

        const { newCompliance } = await prisma.$transaction(async (tx) => {
            await tx.workoutLog.create({
                data: {
                    clientId,
                    assignmentId: assignment.id,
                    dayNumber,
                    status,
                    notes: `Logged via message '${normalizedBody}'`,
                },
            });

            const count = await tx.workoutLog.count({ where: { assignmentId: assignment.id } });
            const compliance = Math.min(100, Math.round((count / Math.max(dayNumber, 1)) * 100));

            await tx.planAssignment.update({
                where: { id: assignment.id },
                data: { compliance },
            });

            return { newCompliance: compliance };
        });

        const { client } = assignment;
        const channel = await getChannel(client.preferredChannel, client.coachId);
        const recipientId = getRecipientId(client);

        const confirmResult = await channel.sendTemplate(recipientId, TemplateId.WORKOUT_LOGGED_CONFIRMATION, {
            client_first_name: client.name.split(" ")[0],
            workout_day_number: dayNumber,
            compliance: newCompliance,
        });
        if (!confirmResult.success) {
            console.warn(`[Message Worker] Failed to send confirmation to ${clientId}: ${confirmResult.error}`);
        }

        await logEvent(isDone ? EventType.WORKOUT_COMPLETED : EventType.WORKOUT_COMPLETED, {
            coachId: client.coachId,
            clientId: client.id,
            channel: client.preferredChannel,
            metadata: { dayNumber, compliance: newCompliance, status },
        });

        console.log(`[Message Worker] Workout ${status} for client ${clientId}, day ${dayNumber}, compliance ${newCompliance}%`);
    },
    { connection }
);
