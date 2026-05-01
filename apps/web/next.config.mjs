import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            { protocol: "https", hostname: "*.supabase.co" },
            { protocol: "https", hostname: "*.supabase.in" },
        ],
    },
    async rewrites() {
        return [
            {
                source: "/ingest/static/:path*",
                destination: "https://eu-assets.i.posthog.com/static/:path*",
            },
            {
                source: "/ingest/array/:path*",
                destination: "https://eu-assets.i.posthog.com/array/:path*",
            },
            {
                source: "/ingest/:path*",
                destination: "https://eu.i.posthog.com/:path*",
            },
        ];
    },
    skipTrailingSlashRedirect: true,
};

const sentryEnabled = Boolean(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT);

export default sentryEnabled
    ? withSentryConfig(nextConfig, {
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        silent: !process.env.CI,
        widenClientFileUpload: true,
        disableLogger: true,
    })
    : nextConfig;
