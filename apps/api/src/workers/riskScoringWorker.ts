import { Worker, Job } from "bullmq";
import { prisma } from "../lib/prisma";
import { connection } from "../lib/queue";
import { JobType } from "../lib/types";
import { logEvent, EventType } from "../lib/event-logger";
import { computeRiskScore, ClientRiskData } from "../services/riskScorer";
import { generateRiskSummary } from "../services/aiRiskSummary";
import { captureWorkerFailure } from "../lib/sentry";

export const riskScoringWorker = new Worker(
    "risk-scoring",
    async (job: Job) => {
        const { clientId, coachId } = job.data;

        console.log(`[Risk Scoring Worker] Computing risk for client ${clientId}`);

        try {
            const client = await prisma.client.findUnique({
                where: { id: clientId },
                select: {
                    name: true,
                    goals: true,
                    checkIns: {
                        orderBy: { createdAt: "desc" },
                        take: 30,
                    },
                    workoutLogs: {
                        orderBy: { createdAt: "desc" },
                        take: 30,
                    },
                    messages: {
                        orderBy: { createdAt: "desc" },
                        take: 30,
                        select: { direction: true, createdAt: true },
                    },
                    payments: {
                        orderBy: { createdAt: "desc" },
                        take: 5,
                        select: { status: true, createdAt: true },
                    },
                    assignments: {
                        where: { isActive: true },
                        select: { scheduleDays: true },
                        take: 1,
                    },
                },
            });

            if (!client) {
                console.log(`[Risk Scoring Worker] Client ${clientId} not found. Skipping.`);
                return;
            }

            const activeAssignment = client.assignments[0];

            const riskData: ClientRiskData = {
                checkIns: client.checkIns,
                workoutLogs: client.workoutLogs,
                messages: client.messages,
                payments: client.payments,
                scheduledDaysPerWeek: activeAssignment?.scheduleDays.length || 0,
            };

            const result = computeRiskScore(riskData);

            let summary: string;
            let suggestion: string | null = null;

            if (result.score > 25) {
                // MODERATE or higher — get AI summary
                const lastCheckIn = client.checkIns[0];
                const aiResult = await generateRiskSummary(
                    result.factors,
                    result.score,
                    {
                        name: client.name,
                        goals: client.goals,
                        lastCheckInNotes: lastCheckIn?.notes || null,
                    },
                );
                summary = aiResult.summary;
                suggestion = aiResult.suggestion;
            } else {
                summary = `${client.name.split(" ")[0]} is on track with consistent engagement.`;
            }

            await prisma.clientRiskScore.upsert({
                where: { clientId },
                create: {
                    clientId,
                    coachId,
                    score: result.score,
                    level: result.level,
                    summary,
                    factors: result.factors,
                    suggestion,
                },
                update: {
                    score: result.score,
                    level: result.level,
                    summary,
                    factors: result.factors,
                    suggestion,
                },
            });

            await logEvent(EventType.RISK_SCORE_COMPUTED, {
                coachId,
                clientId,
                metadata: { score: result.score, level: result.level },
            });
        } catch (error) {
            console.error(`[Risk Scoring Worker] Error for client ${clientId}:`, error);
            throw error;
        }
    },
    { connection }
);

riskScoringWorker.on("completed", (job) =>
    console.log(`[Risk Scoring Worker] Job ${job.id} completed`)
);

riskScoringWorker.on("failed", (job, err) =>
    captureWorkerFailure("riskScoringWorker", err, { jobId: job?.id, jobName: job?.name })
);
