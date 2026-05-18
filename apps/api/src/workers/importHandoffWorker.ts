import { Worker, Job } from "bullmq";
import { prisma } from "../lib/prisma";
import { getChannel, getRecipientId } from "../lib/channels/channel-router";
import { connection } from "../lib/queue";
import { ImportHandoffJob } from "../lib/types";
import { logEvent, EventType } from "../lib/event-logger";
import { TemplateId } from "@fitflow/shared";
import { assertSendSuccess } from "./assert-send";
import { captureWorkerFailure } from "../lib/sentry";

import "../lib/templates";

const DEFAULT_HANDOFF_MESSAGE = "Looking forward to working with you.";

/**
 * Import Handoff Worker: Processes the "import-handoff" queue.
 * Fires the SYSTEM_IMPORT_HANDOFF template to a freshly imported client
 * once their batch is committed.
 *
 * Meta rejects sends with empty {{n}} placeholders, so when the batch's
 * handoffTemplate is null/empty, fall back to a default custom_message.
 */
export const importHandoffWorker = new Worker(
    "import-handoff",
    async (job: Job<ImportHandoffJob>) => {
        const { clientId, coachId, batchId } = job.data;

        console.log(`[Import Handoff Worker] Processing client ${clientId} (batch ${batchId})`);

        try {
            const client = await prisma.client.findFirst({
                where: { id: clientId, coachId },
                include: { coach: true, importBatch: true },
            });

            if (!client) {
                console.log(`[Import Handoff Worker] Client ${clientId} not found / ownership mismatch. Skipping.`);
                return;
            }

            if (client.importBatchId !== batchId) {
                console.log(`[Import Handoff Worker] Client ${clientId} batch mismatch (${client.importBatchId} != ${batchId}). Skipping.`);
                return;
            }

            const channel = await getChannel(client.preferredChannel, client.coachId);
            const recipientId = getRecipientId(client);
            const clientFirstName = client.name.split(" ")[0];
            const coachFirstName = client.coach?.name?.split(" ")[0] || "Your coach";
            const customMessage = client.importBatch?.handoffTemplate?.trim() || DEFAULT_HANDOFF_MESSAGE;

            const result = await channel.sendTemplate(recipientId, TemplateId.SYSTEM_IMPORT_HANDOFF, {
                client_first_name: clientFirstName,
                custom_message: customMessage,
                coach_first_name: coachFirstName,
            });
            assertSendSuccess(result, `Import handoff for client ${clientId} (batch ${batchId})`);

            await logEvent(EventType.IMPORT_HANDOFF_SENT, {
                coachId: client.coachId,
                clientId: client.id,
                channel: client.preferredChannel,
                metadata: { batchId },
            });
        } catch (error) {
            console.error(`[Import Handoff Worker] Error processing job ${job.id}:`, error);
            throw error;
        }
    },
    { connection }
);

importHandoffWorker.on("completed", (job) =>
    console.log(`[Import Handoff Worker] Job ${job.id} completed`)
);

importHandoffWorker.on("failed", (job, err) =>
    captureWorkerFailure("importHandoffWorker", err, { jobId: job?.id, jobName: job?.name })
);
