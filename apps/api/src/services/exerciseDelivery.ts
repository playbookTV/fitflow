import { buildExerciseMessage } from "./messageBuilder";
import { getChannel, getRecipientId } from "../lib/channels/channel-router";
import { prisma } from "../lib/prisma";

export async function sendExerciseToClient(params: {
    exerciseId: string;
    sets: number | null;
    reps: number | null;
    intensity: string | null;
    clientId: string;
    coachId: string;
}) {
    const { exerciseId, sets, reps, intensity, clientId, coachId } = params;

    // Tenant guard: only the owning coach can deliver to this client. Without
    // this filter, a coach could DM another coach's client through the other
    // coach's WhatsApp/Telegram channel (cross-tenant impersonation).
    const client = await prisma.client.findFirst({
        where: { id: clientId, coachId },
    });
    if (!client) {
        throw new Error(`Client ${clientId} not found for coach ${coachId}`);
    }

    const channel = await getChannel(client.preferredChannel, client.coachId);
    const recipientId = getRecipientId(client);

    const { videoUrl, caption } = await buildExerciseMessage({
        exerciseId,
        sets,
        reps,
        intensity,
    });

    if (!channel.sendVideo) {
        // Fallback: send as text with URL
        const fallbackResult = await channel.sendMessage(recipientId, `${caption}\n\n${videoUrl}`, clientId);
        if (!fallbackResult.success) {
            throw new Error(`Fallback message send failed: ${fallbackResult.error || "unknown error"}`);
        }
        return;
    }

    const result = await channel.sendVideo(recipientId, {
        videoUrl,
        caption,
        clientId,
    });
    if (!result.success) {
        throw new Error(`Video send failed: ${result.error || "unknown error"}`);
    }
}

/** Wraps sendExerciseToClient with a single retry on expired video URLs. */
export async function sendWithRetry(
    params: Parameters<typeof sendExerciseToClient>[0]
) {
    try {
        await sendExerciseToClient(params);
    } catch (err: any) {
        if (err?.message?.includes("expired") || err?.status === 403) {
            // Video URL may have expired — getFreshVideoUrl always re-fetches
            await sendExerciseToClient(params);
        } else {
            throw err;
        }
    }
}
