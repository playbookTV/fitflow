import { Worker, Job } from "bullmq";
import { prisma } from "../lib/prisma";
import { env } from "../lib/env";
import { getChannel, getRecipientId } from "../lib/channels/channel-router";
import { connection } from "../lib/queue";
import { JobType } from "../lib/types";
import { logEvent, EventType } from "../lib/event-logger";
import { TemplateId } from "@fitflow/shared";
import { differenceInDays, differenceInWeeks } from "date-fns";
import { getFreshVideoUrl } from "../services/exerciseCache";
import { assertSendSuccess } from "./assert-send";
import { handleCommand } from "./commands";
import { captureWorkerFailure } from "../lib/sentry";

// Ensure all templates are registered
import "../lib/templates";

/**
 * Worker to process workout delivery.
 */
export const workoutWorker = new Worker(
    "workout-delivery",
    async (job: Job) => {
        const { clientId, coachId, dayNumber, assignmentId } = job.data;

        console.log(`[Worker] Processing job ${job.name} for client ${clientId}`);

        try {
            if (job.name === JobType.WORKOUT_DELIVERY) {
                // Scope by clientId AND (when present) the enqueuer's coachId. If the
                // job was enqueued without a coachId, fall back to client-only scope.
                const ownershipWhere = coachId
                    ? { id: assignmentId, clientId, client: { coachId } }
                    : { id: assignmentId, clientId };

                const assignment = await prisma.planAssignment.findFirst({
                    where: ownershipWhere,
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
                    console.log(`[Worker] Assignment ${assignmentId} inactive/missing/ownership-mismatch. Skipping.`);
                    return;
                }

                const { client } = assignment;
                const channel = await getChannel(client.preferredChannel, client.coachId);
                const recipientId = getRecipientId(client);
                const workoutDay = (dayNumber % 7) || 7;

                // Find the matching WorkoutDay for this day number
                const matchingDay = assignment.plan.days.find(d => d.dayNumber === workoutDay);
                const workoutName = matchingDay?.title || assignment.plan.title;
                const hasExercises = !!matchingDay?.exercises && matchingDay.exercises.length > 0;

                // No exercises for today — never tell the client to "check the dashboard"
                // (no client dashboard exists). Send the rest-day template instead and
                // emit WORKOUT_DAY_EMPTY so the coach is alerted to investigate.
                if (!hasExercises) {
                    const coachFirstName = client.coach?.name?.split(" ")[0] || "Your coach";
                    const restResult = await channel.sendTemplate(recipientId, TemplateId.WORKOUT_REST_DAY, {
                        client_first_name: client.name.split(" ")[0],
                        coach_first_name: coachFirstName,
                        clientId: client.id,
                    });
                    assertSendSuccess(restResult, `Workout rest-day delivery for client ${client.id}`);

                    await logEvent(EventType.WORKOUT_DAY_EMPTY, {
                        coachId: client.coachId,
                        clientId: client.id,
                        channel: client.preferredChannel,
                        metadata: {
                            assignmentId,
                            planTitle: assignment.plan.title,
                            dayNumber: workoutDay,
                            reason: matchingDay ? "no_exercises" : "no_matching_day",
                        },
                    });

                    await logEvent(EventType.WORKOUT_DELIVERED, {
                        coachId: client.coachId,
                        clientId: client.id,
                        channel: client.preferredChannel,
                        metadata: { planTitle: assignment.plan.title, dayNumber: workoutDay, restDay: true },
                    });
                    return;
                }

                const exerciseList = matchingDay!.exercises
                    .map((we, i) => {
                        const parts = [`${i + 1}. ${we.exercise.name}`];
                        if (we.sets && we.reps) parts.push(`${we.sets} sets x ${we.reps} reps`);
                        else if (we.sets) parts.push(`${we.sets} sets`);
                        if (we.notes) parts.push(we.notes);
                        return parts.join(" — ");
                    })
                    .join("\n");

                const result = await channel.sendTemplate(recipientId, TemplateId.WORKOUT_DAILY, {
                    workout_day_number: workoutDay,
                    workout_name: workoutName,
                    exercise_list: exerciseList,
                    clientId: client.id,
                });
                assertSendSuccess(result, `Workout delivery for client ${client.id}`);

                // Send demo videos for exercises that have YMove IDs
                let videosAttempted = 0;
                let videosSucceeded = 0;
                let videosFailed = 0;
                const videoFailureReasons: string[] = [];
                const exerciseCount = matchingDay?.exercises?.length ?? 0;
                let exercisesWithoutYmove = 0;

                if (matchingDay?.exercises && channel.sendVideo) {
                    const ymoveExercises = matchingDay.exercises.filter(
                        (we) => we.exercise.ymoveId
                    );
                    exercisesWithoutYmove = exerciseCount - ymoveExercises.length;

                    if (exerciseCount > 0 && ymoveExercises.length === 0) {
                        console.warn(
                            `[Workout Worker] No videos sent for client ${client.id} day ${workoutDay}: ${exerciseCount} exercises but none have ymoveId. Exercises: ${matchingDay.exercises.map((we) => we.exercise.name).join(", ")}`
                        );
                    }

                    for (const we of ymoveExercises) {
                        videosAttempted++;
                        let stage: "ymove_fetch" | "channel_send" = "ymove_fetch";
                        try {
                            const { videoUrl } = await getFreshVideoUrl(we.exercise.ymoveId!);
                            stage = "channel_send";
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
                            videosSucceeded++;
                        } catch (err) {
                            videosFailed++;
                            const errName = (err as Error)?.name ?? "Error";
                            const errMessage = (err as Error)?.message ?? String(err);
                            const reason =
                                errName === "YMoveCapExceededError"
                                    ? "ymove_cap_exceeded"
                                    : stage === "ymove_fetch"
                                        ? "ymove_fetch_error"
                                        : `${client.preferredChannel.toLowerCase()}_send_error`;
                            videoFailureReasons.push(`${we.exercise.name}:${reason}`);
                            console.error(
                                `[Workout Worker] Video send failed (${reason}) for exercise "${we.exercise.name}" (ymoveId=${we.exercise.ymoveId}) client=${client.id} channel=${client.preferredChannel}: ${errMessage}`,
                                err
                            );
                            captureWorkerFailure("workoutProcessor.sendVideo", err, {
                                stage,
                                reason,
                                clientId: client.id,
                                coachId: client.coachId,
                                channel: client.preferredChannel,
                                exerciseName: we.exercise.name,
                                ymoveId: we.exercise.ymoveId,
                                assignmentId,
                                dayNumber: workoutDay,
                            });
                        }
                    }
                }

                console.log(
                    `[Workout Worker] Delivered to client ${client.id} day ${workoutDay}: ${exerciseCount} exercises, videos attempted=${videosAttempted} succeeded=${videosSucceeded} failed=${videosFailed} withoutYmove=${exercisesWithoutYmove}` +
                        (videoFailureReasons.length ? ` reasons=[${videoFailureReasons.join("; ")}]` : "")
                );

                await logEvent(EventType.WORKOUT_DELIVERED, {
                    coachId: client.coachId,
                    clientId: client.id,
                    channel: client.preferredChannel,
                    metadata: {
                        planTitle: assignment.plan.title,
                        dayNumber: workoutDay,
                        exerciseCount,
                        videosAttempted,
                        videosSucceeded,
                        videosFailed,
                        exercisesWithoutYmove,
                        videoFailureReasons,
                    },
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

        const paymentLink = `${env.WEB_URL}/pay/${client.coachId}/${clientId}`;

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

workoutWorker.on("failed", (job, err) => captureWorkerFailure("workoutWorker", err, { jobId: job?.id, jobName: job?.name }));
checkinWorker.on("failed", (job, err) => captureWorkerFailure("checkinWorker", err, { jobId: job?.id, jobName: job?.name }));
onboardingWorker.on("failed", (job, err) => captureWorkerFailure("onboardingWorker", err, { jobId: job?.id, jobName: job?.name }));
renewalWorker.on("failed", (job, err) => captureWorkerFailure("renewalWorker", err, { jobId: job?.id, jobName: job?.name }));

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

        // Plain-text DONE/SKIP/MODIFIED handling. Route to meal vs workout based
        // on which template was most recently delivered to this client (within
        // the last 18 hours), so a "Done" reply lands on the right log instead
        // of always defaulting to workout.
        const isDone = normalizedBody === "DONE";
        const isSkipped = normalizedBody === "SKIP" || normalizedBody === "SKIPPED";
        const isModified = normalizedBody === "MODIFIED" || normalizedBody === "MODIFY";

        if (!isDone && !isSkipped && !isModified) return;

        const since = new Date(Date.now() - 18 * 60 * 60 * 1000);
        const lastDelivery = await prisma.eventLog.findFirst({
            where: {
                clientId,
                eventType: { in: [EventType.WORKOUT_DELIVERED, EventType.MEAL_DELIVERED] },
                createdAt: { gte: since },
            },
            orderBy: { createdAt: "desc" },
        });

        const target: "workout" | "meal" =
            lastDelivery?.eventType === EventType.MEAL_DELIVERED ? "meal" : "workout";

        if (target === "meal") {
            if (isModified) {
                console.log(`[Message Worker] 'Modified' not supported for meals; ignoring for client ${clientId}`);
                return;
            }
            await logMealFromText(clientId, isDone, normalizedBody);
            return;
        }

        const assignment = await prisma.planAssignment.findFirst({
            where: { clientId, isActive: true },
            include: { client: { include: { coach: true } } },
        });

        if (!assignment) {
            console.log(`[Message Worker] No active assignment for client ${clientId}`);
            return;
        }

        let status: "COMPLETED" | "SKIPPED" | "MODIFIED" = "MODIFIED";
        if (isDone) status = "COMPLETED";
        else if (isSkipped) status = "SKIPPED";
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

        await logEvent(EventType.WORKOUT_COMPLETED, {
            coachId: client.coachId,
            clientId: client.id,
            channel: client.preferredChannel,
            metadata: { dayNumber, compliance: newCompliance, status },
        });

        console.log(`[Message Worker] Workout ${status} for client ${clientId}, day ${dayNumber}, compliance ${newCompliance}%`);
    },
    { connection }
);

async function logMealFromText(clientId: string, isDone: boolean, rawBody: string) {
    const mealAssignment = await prisma.mealAssignment.findFirst({
        where: { clientId, isActive: true },
        include: { client: { include: { coach: true } } },
    });

    if (!mealAssignment) {
        console.log(`[Message Worker] No active meal assignment for client ${clientId}`);
        return;
    }

    const dayNumber = differenceInDays(new Date(), mealAssignment.startDate) + 1;
    const status = isDone ? "COMPLETED" : "SKIPPED";

    await prisma.mealLog.create({
        data: {
            clientId,
            assignmentId: mealAssignment.id,
            dayNumber,
            status,
            notes: `Logged via message '${rawBody}'`,
        },
    });

    const totalLogs = await prisma.mealLog.count({ where: { assignmentId: mealAssignment.id } });
    const completedLogs = await prisma.mealLog.count({
        where: { assignmentId: mealAssignment.id, status: "COMPLETED" },
    });
    const compliance = totalLogs > 0 ? Math.round((completedLogs / totalLogs) * 100) : 100;

    await prisma.mealAssignment.update({
        where: { id: mealAssignment.id },
        data: { compliance },
    });

    const { client } = mealAssignment;
    const channel = await getChannel(client.preferredChannel, client.coachId);
    const recipientId = getRecipientId(client);

    const confirmResult = await channel.sendTemplate(recipientId, TemplateId.MEAL_LOGGED_CONFIRMATION, {
        day_number: dayNumber,
        client_first_name: client.name.split(" ")[0],
        compliance,
    });
    if (!confirmResult.success) {
        console.warn(`[Message Worker] Failed to send meal confirmation to ${clientId}: ${confirmResult.error}`);
    }

    await logEvent(EventType.MEAL_COMPLETED, {
        coachId: client.coachId,
        clientId,
        channel: client.preferredChannel,
        metadata: { dayNumber, compliance, status },
    });

    console.log(`[Message Worker] Meal ${status} for client ${clientId}, day ${dayNumber}, compliance ${compliance}%`);
}
