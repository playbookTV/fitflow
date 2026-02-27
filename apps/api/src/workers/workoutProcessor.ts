import { Worker, Job } from "bullmq";
import { MessageChannel, MessageDirection } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { sendMessage } from "../lib/meta";
import { connection } from "../lib/queue";
import { JobType } from "../lib/types";
import { differenceInDays } from "date-fns";

/**
 * Worker to process workout delivery and check-in reminders.
 */
export const workoutWorker = new Worker(
    "workout-delivery",
    async (job: Job) => {
        const { clientId, dayNumber, assignmentId, channel = MessageChannel.WHATSAPP } = job.data;

        console.log(`[Worker] Processing job ${job.name} for client ${clientId}`);

        try {
            if (job.name === JobType.WORKOUT_DELIVERY) {
                // Fetch the assignment and the plan
                const assignment = await prisma.planAssignment.findUnique({
                    where: { id: assignmentId },
                    include: { plan: true }
                });

                if (!assignment || !assignment.isActive) {
                    console.log(`[Worker] Assignment ${assignmentId} is inactive or missing. Skipping.`);
                    return;
                }

                const workoutDay = (dayNumber % 7) || 7; // Map to 1-7
                const message = `🏋️‍♂️ *Workout Time!*\n\nPlan: *${assignment.plan.title}*\nDay: ${workoutDay}\n\nCheck your dashboard for today's exercise videos and tracking: ${process.env.WEB_URL}/dashboard/workouts\n\nReply *DONE* when you're finished! 🔥`;

                await sendMessage(channel, clientId, message, clientId);
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
        const { clientId, channel = MessageChannel.WHATSAPP } = job.data;
        console.log(`[Checkin Worker] Sending reminder to ${clientId}`);

        const message = `📊 *Weekly Check-in Tool*\n\nHey! It's time for your weekly check-in. Tracking your progress is key to results.\n\nClick here to start: ${process.env.WEB_URL}/dashboard/checkin\n\n(WhatsApp Flows coming soon for native check-ins!)`;
        await sendMessage(channel, clientId, message, clientId);
    },
    { connection }
);

/**
 * Worker to process onboarding intake flows.
 */
export const onboardingWorker = new Worker(
    "onboarding-intake",
    async (job: Job) => {
        const { clientId, channel = MessageChannel.WHATSAPP } = job.data;
        console.log(`[Onboarding Worker] Sending intake flow to ${clientId}`);

        const message = `👋 *Welcome to FitFlow!*\n\nI'm your automated assistant. To get started, I need to collect some info (goals, injuries, etc.).\n\nClick here to fill your intake form: ${process.env.WEB_URL}/onboarding?id=${clientId}\n\nOnce done, your trainer will assign your first plan! 🚀`;
        await sendMessage(channel, clientId, message, clientId);
    },
    { connection }
);

workoutWorker.on("completed", (job) => console.log(`[Workout Worker] Job ${job.id} completed`));
checkinWorker.on("completed", (job) => console.log(`[Checkin Worker] Job ${job.id} completed`));
onboardingWorker.on("completed", (job) => console.log(`[Onboarding Worker] Job ${job.id} completed`));

/**
 * Worker to process incoming WhatsApp messages (Conversational Logging)
 */
export const messageWorker = new Worker(
    "workout-delivery", // Shared queue
    async (job: Job) => {
        if (job.name === "handle-new-lead") {
            const { instagramId, channel } = job.data;
            const message = "🔥 Awesome! You're ready to start your SHRED transformation. First, tell me your name so I can set up your profile!";
            await sendMessage(channel, instagramId, message); // No clientId yet for new leads
            return;
        }

        if (job.name !== "process-message") return;

        const { clientId, body, channel = MessageChannel.WHATSAPP } = job.data;
        const normalizedBody = body.trim().toUpperCase();

        console.log(`[Message Worker] Processing message from ${clientId}: ${body} [${channel}]`);

        if (normalizedBody === "DONE") {
            // Find active assignment
            const assignment = await prisma.planAssignment.findFirst({
                where: { clientId, isActive: true },
                include: { client: true }
            });

            if (!assignment) {
                console.log(`[Message Worker] No active assignment for client ${clientId}`);
                return;
            }

            // Calculate dayNumber relative to start date
            const dayNumber: number = differenceInDays(new Date(), assignment.startDate) + 1;

            // Log the workout
            await prisma.workoutLog.create({
                data: {
                    clientId,
                    assignmentId: assignment.id,
                    dayNumber,
                    status: "COMPLETED",
                    notes: `Logged via ${channel} 'DONE'`
                }
            });

            // Calculate new compliance (simplified for MVP: 1 workout = 10% progress)
            const logCount = await prisma.workoutLog.count({ where: { assignmentId: assignment.id } });
            const newCompliance = Math.min(100, logCount * 10);

            await prisma.planAssignment.update({
                where: { id: assignment.id },
                data: { compliance: newCompliance }
            });

            const reply = `🔥 *Boom!* Workout logged for Day ${dayNumber}. Great work, ${assignment.client.name}! Your compliance is now ${newCompliance}%. Keep it up! 🏋️‍♂️`;
            await sendMessage(channel, clientId, reply, clientId);
        }
    },
    { connection }
);

