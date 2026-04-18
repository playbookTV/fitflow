"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/auth";
import { formatCurrency } from "@/lib/tokens";
import { Check, Loader2 } from "lucide-react";

interface TierInfo {
    tier: string;
    limits: {
        maxClients: number;
        maxChannels: number;
        maxBots: number;
        analytics: boolean;
        paymentCollection: boolean;
        checkinSequences: boolean;
        whiteLabel: boolean;
    };
    pricing: { monthly: number; annual: number };
    currency: string;
}

interface PricingTiersProps {
    tiers: TierInfo[];
    currentTier?: string;
    onSubscribed?: () => void;
}

const TIER_LABELS: Record<string, { name: string; badge?: string }> = {
    STARTER: { name: "Starter" },
    PRO: { name: "Pro", badge: "Most Popular" },
    STUDIO: { name: "Studio" },
};

const TIER_FEATURES: Record<string, string[]> = {
    STARTER: [
        "Up to 10 clients",
        "1 delivery channel",
        "1 Telegram bot",
        "Workout + meal templates",
        "Check-in automation",
        "Basic scheduling",
    ],
    PRO: [
        "Up to 30 clients",
        "Telegram + WhatsApp delivery",
        "Unlimited bot provisioning",
        "Full nutrition database",
        "Check-in sequences + analytics",
        "Stripe payment collection",
    ],
    STUDIO: [
        "Up to 75 clients",
        "Everything in Pro",
        "White-label client experience",
        "Team dashboard + reporting",
        "Sub-accounts (coming soon)",
        "Priority support",
    ],
};

function formatPrice(cents: number, currency: string): string {
    return formatCurrency(cents / 100, currency.toUpperCase());
}

export function PricingTiers({ tiers, currentTier, onSubscribed }: PricingTiersProps) {
    const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
    const [loadingTier, setLoadingTier] = useState<string | null>(null);

    const handleSubscribe = async (tier: string) => {
        setLoadingTier(tier);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/subscriptions/checkout`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(await getAuthHeaders()),
                    },
                    body: JSON.stringify({
                        tier,
                        interval: interval === "annual" ? "ANNUAL" : "MONTHLY",
                    }),
                }
            );
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            console.error("Checkout error:", err);
        } finally {
            setLoadingTier(null);
        }
    };

    const handleChange = async (tier: string) => {
        setLoadingTier(tier);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/subscriptions/change`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(await getAuthHeaders()),
                    },
                    body: JSON.stringify({
                        tier,
                        interval: interval === "annual" ? "ANNUAL" : "MONTHLY",
                    }),
                }
            );
            if (res.ok) {
                onSubscribed?.();
            }
        } catch (err) {
            console.error("Plan change error:", err);
        } finally {
            setLoadingTier(null);
        }
    };

    return (
        <div>
            {/* Interval Toggle */}
            <div className="flex justify-center mb-8">
                <div className="flex items-center gap-1 p-1 bg-bg-primary rounded-xl border border-border">
                    <button
                        onClick={() => setInterval("monthly")}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-[color,background-color] duration-200",
                            interval === "monthly"
                                ? "bg-brand-green text-white"
                                : "text-text-faint hover:text-white"
                        )}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setInterval("annual")}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-[color,background-color] duration-200",
                            interval === "annual"
                                ? "bg-brand-green text-white"
                                : "text-text-faint hover:text-white"
                        )}
                    >
                        Annual
                        <span className="ml-1.5 text-xs text-brand-green">Save 20%</span>
                    </button>
                </div>
            </div>

            {/* Tier Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {tiers.map((t) => {
                    const label = TIER_LABELS[t.tier] || { name: t.tier };
                    const features = TIER_FEATURES[t.tier] || [];
                    const price = interval === "annual" ? t.pricing.annual : t.pricing.monthly;
                    const isCurrent = currentTier === t.tier;
                    const isPro = t.tier === "PRO";

                    return (
                        <div
                            key={t.tier}
                            className={cn(
                                "relative rounded-2xl border p-6 flex flex-col",
                                isPro
                                    ? "border-brand-green bg-brand-green/5 shadow-glow-green"
                                    : "border-border bg-bg-secondary"
                            )}
                        >
                            {label.badge && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <span className="px-3 py-1 bg-brand-green text-white text-xs font-bold rounded-full">
                                        {label.badge}
                                    </span>
                                </div>
                            )}

                            <div className="mb-4">
                                <h3 className="text-lg font-bold text-white">{label.name}</h3>
                                <div className="mt-2">
                                    <span className="text-3xl font-bold text-white">
                                        {formatPrice(price, t.currency)}
                                    </span>
                                    <span className="text-text-faint text-sm">/mo</span>
                                </div>
                                {interval === "annual" && (
                                    <p className="text-xs text-text-faint mt-1">
                                        billed {formatPrice(price * 12, t.currency)}/year
                                    </p>
                                )}
                                <p className="text-sm text-text-secondary mt-2">
                                    up to {t.limits.maxClients} clients
                                </p>
                            </div>

                            <ul className="flex-1 space-y-3 mb-6">
                                {features.map((f) => (
                                    <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                                        <Check className="w-4 h-4 text-brand-green shrink-0 mt-0.5" aria-hidden="true" />
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            {isCurrent ? (
                                <button
                                    disabled
                                    className="w-full py-2.5 rounded-xl text-sm font-medium bg-white/5 text-text-faint border border-border cursor-default"
                                >
                                    Current Plan
                                </button>
                            ) : (
                                <button
                                    onClick={() => currentTier ? handleChange(t.tier) : handleSubscribe(t.tier)}
                                    disabled={!!loadingTier}
                                    className={cn(
                                        "w-full py-2.5 rounded-xl text-sm font-medium transition-[color,background-color] duration-200",
                                        isPro
                                            ? "bg-brand-green text-white hover:bg-brand-green/90"
                                            : "bg-white/10 text-white hover:bg-white/15 border border-border"
                                    )}
                                >
                                    {loadingTier === t.tier ? (
                                        <Loader2 className="w-4 h-4 animate-spin mx-auto" aria-hidden="true" />
                                    ) : currentTier ? (
                                        "Switch Plan"
                                    ) : (
                                        "Start 7-Day Trial"
                                    )}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
