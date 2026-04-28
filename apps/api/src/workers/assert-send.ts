import { UnrecoverableError } from "bullmq";
import { SendResult } from "@fitflow/shared";

/**
 * Assert that a send result was successful.
 * - On success: returns normally.
 * - On non-retryable failure (e.g. template not found): throws UnrecoverableError
 *   so BullMQ moves the job straight to "failed" without retries.
 * - On retryable failure: throws a regular Error so BullMQ retries with backoff.
 */
export function assertSendSuccess(result: SendResult, context: string): void {
    if (result.success) return;

    const msg = `${context}: ${result.error}`;

    if (result.retryable === false) {
        console.error(`[NON-RETRYABLE] ${msg}`);
        throw new UnrecoverableError(msg);
    }

    throw new Error(msg);
}
