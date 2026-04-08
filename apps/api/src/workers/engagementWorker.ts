import { Worker, Job } from "bullmq";
import { prisma } from "../lib/prisma";
import { getChannel, getRecipientId } from "../lib/channels/channel-router";
import { connection } from "../lib/queue";
import { JobType } from "../lib/types";
import { logEvent, EventType } from "../lib/event-logger";
import { TemplateId } from "@fitflow/shared";

// Ensure all templates are registered
import "../lib/templates";

/**
 * Engagement Worker: Processes the "engagement" queue.
 * Handles missed workout follow-ups, at-risk alerts, re-engagement,
 * missed check-in nudges, milestones, and week summaries.
 */
export const engagementWorker = new Worker(
    "engagement",
    async (job: Job) => {
        const { clientId, coachId } = job.data;

        console.log(`[Engagement Worker] Processing ${job.name} for client ${clientId}`);

        try {
            const client = await prisma.client.findUnique({
                where: { id: clientId },
                include: { coach: true },
            });

            if (!client) {
                console.log(`[Engagement Worker] Client ${clientId} not found. Skipping.`);
                return;
            }

            const channel = await getChannel(client.preferredChannel, client.coachId);
            const recipientId = getRecipientId(client);
            const clientFirstName = client.name.split(" ")[0];
            const coachFirstName = client.coach?.name?.split(" ")[0] || "Your coach";

            switch (job.name) {
                case JobType.MISSED_WORKOUT_FOLLOWUP: {
                    await channel.sendTemplate(recipientId, TemplateId.ATRISK_MISSED_WORKOUT, {
                        client_first_name: clientFirstName,
                        coach_first_name: coachFirstName,
                    });

                    await logEvent(EventType.MISSED_WORKOUT_FOLLOWUP_SENT, {
                        coachId: client.coachId,
                        clientId: client.id,
                        channel: client.preferredChannel,
                    });
                    break;
                }

                case JobType.ATRISK_DETECTION: {
                    await channel.sendTemplate(recipientId, TemplateId.ATRISK_THREE_PLUS, {
                        client_first_name: clientFirstName,
                        coach_first_name: coachFirstName,
                    });

                    await logEvent(EventType.ATRISK_ALERT_SENT, {
                        coachId: client.coachId,
                        clientId: client.id,
                        channel: client.preferredChannel,
                    });
                    break;
                }

                case JobType.REENGAGEMENT: {
                    await channel.sendTemplate(recipientId, TemplateId.ATRISK_LAPSED, {
                        client_first_name: clientFirstName,
                        coach_first_name: coachFirstName,
                    });

                    await logEvent(EventType.REENGAGEMENT_SENT, {
                        coachId: client.coachId,
                        clientId: client.id,
                        channel: client.preferredChannel,
                    });
                    break;
                }

                case JobType.MISSED_CHECKIN_NUDGE: {
                    const { programmeWeek, checkinLink } = job.data;

                    await channel.sendTemplate(recipientId, TemplateId.CHECKIN_MISSED_NUDGE, {
                        client_first_name: clientFirstName,
                        programme_week: programmeWeek,
                        checkin_link: checkinLink,
                    });

                    await logEvent(EventType.MISSED_CHECKIN_NUDGE_SENT, {
                        coachId: client.coachId,
                        clientId: client.id,
                        channel: client.preferredChannel,
                        metadata: { programmeWeek },
                    });
                    break;
                }

                case JobType.MILESTONE_CHECK: {
                    const { milestoneType, programmeWeek, totalWeeks, offerName } = job.data;

                    if (milestoneType === "halfway") {
                        await channel.sendTemplate(recipientId, TemplateId.MILESTONE_HALFWAY, {
                            client_first_name: clientFirstName,
                            coach_first_name: coachFirstName,
                            programme_week: programmeWeek,
                            total_weeks: totalWeeks,
                        });
                    } else if (milestoneType === "completion") {
                        await channel.sendTemplate(recipientId, TemplateId.MILESTONE_COMPLETION, {
                            client_first_name: clientFirstName,
                            coach_first_name: coachFirstName,
                            offer_name: offerName,
                            total_weeks: totalWeeks,
                        });
                    }

                    await logEvent(EventType.MILESTONE_SENT, {
                        coachId: client.coachId,
                        clientId: client.id,
                        channel: client.preferredChannel,
                        metadata: { milestoneType, programmeWeek, totalWeeks },
                    });
                    break;
                }

                case JobType.WEEK_SUMMARY: {
                    const {
                        programmeWeek,
                        totalWeeks,
                        sessionsCompleted,
                        sessionsSkipped,
                        sessionsScheduled,
                        consistencyRate,
                    } = job.data;

                    const weeklySummary = [
                        `\u{2705} Sessions completed: ${sessionsCompleted}/${sessionsScheduled}`,
                        `\u{23ED} Sessions skipped: ${sessionsSkipped}`,
                        `\u{1F525} Consistency rate: ${consistencyRate}%`,
                    ].join("\n");

                    await channel.sendTemplate(recipientId, TemplateId.WORKOUT_WEEK_SUMMARY, {
                        programme_week: programmeWeek,
                        total_weeks: totalWeeks,
                        weekly_summary: weeklySummary,
                        coach_first_name: coachFirstName,
                    });

                    await logEvent(EventType.WEEK_SUMMARY_SENT, {
                        coachId: client.coachId,
                        clientId: client.id,
                        channel: client.preferredChannel,
                        metadata: { programmeWeek, sessionsCompleted, sessionsScheduled, consistencyRate },
                    });
                    break;
                }

                default:
                    console.log(`[Engagement Worker] Unknown job type: ${job.name}`);
            }
        } catch (error) {
            console.error(`[Engagement Worker] Error processing job ${job.id}:`, error);
            throw error;
        }
    },
    { connection }
);

engagementWorker.on("completed", (job) =>
    console.log(`[Engagement Worker] Job ${job.id} (${job.name}) completed`)
);
