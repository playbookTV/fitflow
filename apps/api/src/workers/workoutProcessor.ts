import { Worker, Job } from "bullmq";
import { prisma } from "../lib/prisma";
import { getChannel, getRecipientId } from "../lib/channels/channel-router";
import { connection } from "../lib/queue";
import { JobType } from "../lib/types";
import { logEvent, EventType } from "../lib/event-logger";
import { differenceInDays } from "date-fns";

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
                    include: { plan: true, client: true },
                });

                if (!assignment?.isActive) {
                    console.log(`[Worker] Assignment ${assignmentId} is inactive or missing. Skipping.`);
                    return;
                }

                const { client } = assignment;
                const channel = await getChannel(client.preferredChannel, client.coachId);
                const recipientId = getRecipientId(client);
                const workoutDay = (dayNumber % 7) || 7;

                await channel.sendWorkout(recipientId, {
                    clientId: client.id,
                    clientName: client.name,
                    planTitle: assignment.plan.title,
                    dayNumber: workoutDay,
                    dashboardUrl: `${process.env.WEB_URL}/dashboard/workouts`,
                });

                await logEvent(EventType.WORKOUT_DELIVERED, {
                    coachId: client.coachId,
                    clientId: client.id,
                    channel: client.preferredChannel,
                    metadata: { planTitle: assignment.plan.title, dayNumber: workoutDay },
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

        const client = await prisma.client.findUnique({ where: { id: clientId } });
        if (!client) return;

        const channel = await getChannel(client.preferredChannel, client.coachId);
        const recipientId = getRecipientId(client);

        await channel.sendStructuredCheckIn(recipientId, {
            clientId: client.id,
            clientName: client.name,
        });

        await logEvent(EventType.CHECKIN_SENT, {
            coachId: client.coachId,
            clientId: client.id,
            channel: client.preferredChannel,
        });
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
        console.log(`[Onboarding Worker] Sending intake flow to ${clientId}`);

        const client = await prisma.client.findUnique({ where: { id: clientId } });
        if (!client) return;

        const channel = await getChannel(client.preferredChannel, client.coachId);
        const recipientId = getRecipientId(client);

        await channel.sendOnboarding(recipientId, {
            clientId: client.id,
            clientName: client.name,
            intakeFormUrl: `${process.env.WEB_URL}/onboarding?id=${clientId}`,
        });

        await logEvent(EventType.ONBOARDING_SENT, {
            coachId: client.coachId,
            clientId: client.id,
            channel: client.preferredChannel,
        });
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

        const client = await prisma.client.findUnique({ where: { id: clientId } });
        if (!client) return;

        const channel = await getChannel(client.preferredChannel, client.coachId);
        const recipientId = getRecipientId(client);

        const message = daysUntilRenewal === 1
            ? `⏰ *Renewal Reminder*\n\nHey ${client.name}! Your *${planTitle}* coaching plan expires tomorrow. Renew now to keep your progress going!`
            : `⏰ *Renewal Reminder*\n\nHey ${client.name}! Your *${planTitle}* coaching plan renews in ${daysUntilRenewal} days. Get in touch with your coach to continue.`;

        await channel.sendMessage(recipientId, message, clientId);

        await logEvent(EventType.CHECKIN_SENT, {
            coachId: client.coachId,
            clientId: client.id,
            channel: client.preferredChannel,
            metadata: { type: "renewal_reminder", planTitle, daysUntilRenewal },
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
 */
export const messageWorker = new Worker(
    "workout-delivery", // Shared queue
    async (job: Job) => {
        if (job.name !== "process-message") return;

        const { clientId, body } = job.data;
        const normalizedBody = body.trim().toUpperCase();

        console.log(`[Message Worker] Processing message from ${clientId}: ${body}`);

        if (normalizedBody === "DONE") {
            const assignment = await prisma.planAssignment.findFirst({
                where: { clientId, isActive: true },
                include: { client: true },
            });

            if (!assignment) {
                console.log(`[Message Worker] No active assignment for client ${clientId}`);
                return;
            }

            const dayNumber = differenceInDays(new Date(), assignment.startDate) + 1;

            await prisma.workoutLog.create({
                data: {
                    clientId,
                    assignmentId: assignment.id,
                    dayNumber,
                    status: "COMPLETED",
                    notes: `Logged via message 'DONE'`,
                },
            });

            const logCount = await prisma.workoutLog.count({ where: { assignmentId: assignment.id } });
            const newCompliance = Math.min(100, logCount * 10);

            await prisma.planAssignment.update({
                where: { id: assignment.id },
                data: { compliance: newCompliance },
            });

            const { client } = assignment;
            const channel = await getChannel(client.preferredChannel, client.coachId);
            const recipientId = getRecipientId(client);

            await channel.sendMessage(
                recipientId,
                `🔥 *Boom!* Workout logged for Day ${dayNumber}. Great work, ${client.name}! Your compliance is now ${newCompliance}%. Keep it up! 🏋️‍♂️`,
                clientId
            );

            await logEvent(EventType.WORKOUT_COMPLETED, {
                coachId: client.coachId,
                clientId: client.id,
                channel: client.preferredChannel,
                metadata: { dayNumber, compliance: newCompliance },
            });
        }
    },
    { connection }
);
