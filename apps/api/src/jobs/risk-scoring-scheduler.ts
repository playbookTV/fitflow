import cron from "node-cron";
import { riskScoringQueue } from "../lib/queue";
import { JobType } from "../lib/types";
import { prisma } from "../lib/prisma";

/**
 * Risk Scoring Scheduler: Runs daily at 20:00 UTC.
 * One hour before the engagement scheduler (21:00 UTC) so coaches
 * see updated risk data before automated nudges go out.
 *
 * Enqueues a RISK_SCORE_COMPUTE job for every ACTIVE client.
 */
export const startRiskScoringScheduler = () => {
    cron.schedule("0 20 * * *", async () => {
        console.log("[RiskScoringScheduler] Starting daily risk scoring...");

        try {
            const activeClients = await prisma.client.findMany({
                where: { status: "ACTIVE", __unsafeGlobal: true } as never,
                select: { id: true, coachId: true },
            });

            if (activeClients.length === 0) {
                console.log("[RiskScoringScheduler] No active clients. Skipping.");
                return;
            }

            await riskScoringQueue.addBulk(
                activeClients.map((client) => ({
                    name: JobType.RISK_SCORE_COMPUTE,
                    data: {
                        clientId: client.id,
                        coachId: client.coachId,
                    },
                }))
            );

            console.log(`[RiskScoringScheduler] Enqueued ${activeClients.length} risk scoring jobs.`);
        } catch (error) {
            console.error("[RiskScoringScheduler] Error:", error);
        }
    });

    console.log("[RiskScoringScheduler] Scheduled daily at 20:00 UTC");
};
