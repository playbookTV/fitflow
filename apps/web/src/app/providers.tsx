"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
        if (!token) return;
        posthog.init(token, {
            api_host: "/ingest",
            ui_host: "https://eu.posthog.com",
            defaults: "2026-01-30",
            capture_exceptions: true,
            debug: process.env.NODE_ENV === "development",
        });
    }, []);

    return <PHProvider client={posthog}>{children}</PHProvider>;
}
