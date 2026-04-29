import { Worker, Job } from "bullmq";
import { prisma } from "../lib/prisma";
import { getChannel, getRecipientId } from "../lib/channels/channel-router";
import { connection } from "../lib/queue";
import { JobType } from "../lib/types";
import { logEvent, EventType } from "../lib/event-logger";
import { TemplateId } from "@fitflow/shared";
import { assertSendSuccess } from "./assert-send";

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
                    const missedResult = await channel.sendTemplate(recipientId, TemplateId.ATRISK_MISSED_WORKOUT, {
                        client_first_name: clientFirstName,
                        coach_first_name: coachFirstName,
                    });
                    assertSendSuccess(missedResult, `Missed workout follow-up for client ${clientId}`);

                    await logEvent(EventType.MISSED_WORKOUT_FOLLOWUP_SENT, {
                        coachId: client.coachId,
                        clientId: client.id,
                        channel: client.preferredChannel,
                    });
                    break;
                }

                case JobType.ATRISK_DETECTION: {
                    const atriskResult = await channel.sendTemplate(recipientId, TemplateId.ATRISK_THREE_PLUS, {
                        client_first_name: clientFirstName,
                        coach_first_name: coachFirstName,
                    });
                    assertSendSuccess(atriskResult, `At-risk detection for client ${clientId}`);

                    await logEvent(EventType.ATRISK_ALERT_SENT, {
                        coachId: client.coachId,
                        clientId: client.id,
                        channel: client.preferredChannel,
                    });
                    break;
                }

                case JobType.REENGAGEMENT: {
                    const reengageResult = await channel.sendTemplate(recipientId, TemplateId.ATRISK_LAPSED, {
                        client_first_name: clientFirstName,
                        coach_first_name: coachFirstName,
                    });
                    assertSendSuccess(reengageResult, `Re-engagement for client ${clientId}`);

                    await logEvent(EventType.REENGAGEMENT_SENT, {
                        coachId: client.coachId,
                        clientId: client.id,
                        channel: client.preferredChannel,
                    });
                    break;
                }

                case JobType.MISSED_CHECKIN_NUDGE: {
                    const { programmeWeek, checkinLink } = job.data;

                    const nudgeResult = await channel.sendTemplate(recipientId, TemplateId.CHECKIN_MISSED_NUDGE, {
                        client_first_name: clientFirstName,
                        programme_week: programmeWeek,
                        checkin_link: checkinLink,
                        clientId: client.id,
                    });

                    assertSendSuccess(nudgeResult, `Missed check-in nudge for client ${clientId} via ${client.preferredChannel}`);

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

                    let milestoneResult;
                    if (milestoneType === "halfway") {
                        milestoneResult = await channel.sendTemplate(recipientId, TemplateId.MILESTONE_HALFWAY, {
                            client_first_name: clientFirstName,
                            coach_first_name: coachFirstName,
                            programme_week: programmeWeek,
                            total_weeks: totalWeeks,
                        });
                    } else if (milestoneType === "completion") {
                        milestoneResult = await channel.sendTemplate(recipientId, TemplateId.MILESTONE_COMPLETION, {
                            client_first_name: clientFirstName,
                            coach_first_name: coachFirstName,
                            offer_name: offerName,
                            total_weeks: totalWeeks,
                        });
                    }
                    if (milestoneResult) {
                        assertSendSuccess(milestoneResult, `Milestone (${milestoneType}) for client ${clientId}`);
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
                        `Sessions completed: ${sessionsCompleted}/${sessionsScheduled}`,
                        `Sessions skipped: ${sessionsSkipped}`,
                        `Consistency rate: ${consistencyRate}%`,
                    ].join(" | ");

                    const summaryResult = await channel.sendTemplate(recipientId, TemplateId.WORKOUT_WEEK_SUMMARY, {
                        programme_week: programmeWeek,
                        total_weeks: totalWeeks,
                        weekly_summary: weeklySummary,
                        coach_first_name: coachFirstName,
                    });
                    assertSendSuccess(summaryResult, `Week summary for client ${clientId}`);

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
