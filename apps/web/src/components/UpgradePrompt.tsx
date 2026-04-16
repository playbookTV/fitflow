"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";

interface UpgradePromptProps {
    resource: string;
    limit: number;
    tier: string;
}

const NEXT_TIER: Record<string, string> = {
    STARTER: "Pro",
    PRO: "Studio",
};

export function UpgradePrompt({ resource, limit, tier }: UpgradePromptProps) {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    const nextTier = NEXT_TIER[tier] || "a higher plan";
    const resourceLabel = resource === "clients" ? "clients" : resource.replace(/([A-Z])/g, " $1").toLowerCase().trim();

    return (
        <div className="relative flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-orange/10 border border-brand-orange/20 mb-4">
            <div className="flex-1">
                <p className="text-sm text-white">
                    You&apos;ve reached your limit of{" "}
                    <span className="font-bold">{limit} {resourceLabel}</span> on the{" "}
                    <span className="font-bold capitalize">{tier.toLowerCase()}</span> plan.
                </p>
                <Link
                    href="/dashboard/subscription"
                    className="inline-flex items-center gap-1 text-sm text-brand-orange hover:underline mt-1"
                >
                    Upgrade to {nextTier}
                    <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
            </div>
            <button
                onClick={() => setDismissed(true)}
                className="p-1 rounded-lg text-text-faint hover:text-white hover:bg-white/5 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
