import * as Sentry from "@sentry/node";

let initialized = false;

export function initSentry(): void {
    if (initialized) return;
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) return;

    Sentry.init({
        dsn,
        environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
        release: process.env.SENTRY_RELEASE || process.env.RAILWAY_GIT_COMMIT_SHA,
        tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
            ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
            : 0.1,
    });
    initialized = true;
}

export function captureWorkerFailure(
    workerName: string,
    err: unknown,
    extra: Record<string, unknown> = {},
): void {
    if (!process.env.SENTRY_DSN) return;
    Sentry.captureException(err, {
        tags: { worker: workerName },
        extra,
    });
}

export { Sentry };
