import { PostHog } from "posthog-node";

const apiKey = process.env.POSTHOG_API_KEY;

// Stub used when POSTHOG_API_KEY is unset — keeps callers (e.g. error middleware
// in index.ts calling posthog.captureException) safe instead of crashing the
// process at boot.
const stub = {
    capture: () => {},
    captureException: () => {},
    identify: () => {},
    alias: () => {},
    flush: async () => {},
    shutdown: async () => {},
};

const posthog: any = apiKey
    ? new PostHog(apiKey, {
        host: process.env.POSTHOG_HOST,
        enableExceptionAutocapture: true,
    })
    : stub;

export default posthog;
