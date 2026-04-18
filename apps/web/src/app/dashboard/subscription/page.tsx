"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PricingTiers } from "@/components/PricingTiers";
import { useSubscription } from "@/hooks/useSubscription";
import { getAuthHeaders } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";
import {
    Crown,
    CreditCard,
    ExternalLink,
    Loader2,
    AlertTriangle,
    Clock,
    CheckCircle2,
    FileText,
    Download,
    Users,
} from "lucide-react";

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

interface Invoice {
    id: string;
    amount: number;
    currency: string;
    status: string;
    created: string;
    hostedUrl: string | null;
    pdfUrl: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    TRIALING: { label: "Trial", className: "badge-blue", icon: Clock },
    ACTIVE: { label: "Active", className: "badge-green", icon: CheckCircle2 },
    PAST_DUE: { label: "Past Due", className: "badge-red", icon: AlertTriangle },
    CANCELED: { label: "Canceled", className: "badge-amber", icon: AlertTriangle },
};

function formatCurrency(cents: number, currency: string = "usd") {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
    }).format(cents / 100);
}

export default function SubscriptionPage() {
    const sub = useSubscription();
    const [tiers, setTiers] = useState<TierInfo[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [showPricing, setShowPricing] = useState(false);
    const [portalLoading, setPortalLoading] = useState(false);

    useEffect(() => {
        fetchTiers();
        fetchInvoices();
    }, []);

    const fetchTiers = async () => {
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/subscriptions/tiers`,
                { headers: await getAuthHeaders() }
            );
            if (res.ok) {
                const data = await res.json();
                setTiers(data.tiers);
            }
        } catch {}
    };

    const fetchInvoices = async () => {
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/subscriptions/invoices`,
                { headers: await getAuthHeaders() }
            );
            if (res.ok) {
                const data = await res.json();
                setInvoices(data.invoices);
            }
        } catch {}
    };

    const openPortal = async () => {
        setPortalLoading(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/subscriptions/portal`,
                {
                    method: "POST",
                    headers: await getAuthHeaders(),
                }
            );
            const data = await res.json();
            if (data.url) window.location.href = data.url;
        } catch {
            console.error("Failed to open billing portal");
        } finally {
            setPortalLoading(false);
        }
    };

    if (sub.isLoading) {
        return (
            <DashboardLayout title="Subscription">
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-text-faint" />
                </div>
            </DashboardLayout>
        );
    }

    // Not subscribed — show pricing
    if (!sub.subscribed) {
        return (
            <DashboardLayout title="Choose Your Plan" subtitle="Start your 7-day free trial">
                <div className="max-w-4xl mx-auto">
                    {tiers.length > 0 ? (
                        <PricingTiers tiers={tiers} onSubscribed={() => sub.refetch()} />
                    ) : (
                        <div className="text-center py-12 text-text-faint">Loading plans...</div>
                    )}
                </div>
            </DashboardLayout>
        );
    }

    const statusConfig = STATUS_CONFIG[sub.status || ""] || STATUS_CONFIG.ACTIVE;
    const StatusIcon = statusConfig.icon;

    return (
        <DashboardLayout title="Subscription">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Trial Banner */}
                {sub.isTrialing && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-blue/10 border border-brand-blue/20">
                        <Clock className="w-5 h-5 text-brand-blue shrink-0" />
                        <div>
                            <p className="text-sm text-white font-medium">
                                Trial ends in {sub.trialDaysLeft} day{sub.trialDaysLeft !== 1 ? "s" : ""}
                            </p>
                            <p className="text-xs text-text-faint">
                                Your card will be charged when the trial ends. Manage billing to cancel anytime.
                            </p>
                        </div>
                    </div>
                )}

                {/* Cancel Warning */}
                {sub.cancelAtPeriodEnd && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-orange/10 border border-brand-orange/20">
                        <AlertTriangle className="w-5 h-5 text-brand-orange shrink-0" />
                        <div>
                            <p className="text-sm text-white font-medium">
                                Your subscription will cancel at the end of this billing period
                            </p>
                            <p className="text-xs text-text-faint">
                                Access continues until {sub.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : "period end"}.
                                Reactivate from the billing portal.
                            </p>
                        </div>
                    </div>
                )}

                {/* Current Plan Card */}
                <div className="rounded-2xl border border-border bg-bg-secondary p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-brand-green/10">
                                <Crown className="w-5 h-5 text-brand-green" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white capitalize">
                                    {(sub.tier || "").toLowerCase()} Plan
                                </h2>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className={cn("badge", statusConfig.className)}>
                                        <StatusIcon className="w-3 h-3" />
                                        {statusConfig.label}
                                    </span>
                                    <span className="text-xs text-text-faint capitalize">
                                        {(sub.billingInterval || "").toLowerCase()} billing
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowPricing(!showPricing)}
                                className="btn-secondary text-sm"
                            >
                                Change Plan
                            </button>
                            <button
                                onClick={openPortal}
                                disabled={portalLoading}
                                className="btn-primary text-sm"
                            >
                                {portalLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <CreditCard className="w-4 h-4" />
                                        Manage Billing
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Usage Bars */}
                    {sub.limits && sub.usage && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <UsageBar
                                label="Clients"
                                icon={Users}
                                current={sub.usage.clients}
                                limit={sub.limits.maxClients}
                            />
                        </div>
                    )}

                    {/* Period Info */}
                    <div className="mt-4 pt-4 border-t border-border flex gap-6 text-xs text-text-faint">
                        {sub.currentPeriodStart && (
                            <span>Period started: {formatDate(sub.currentPeriodStart)}</span>
                        )}
                        {sub.currentPeriodEnd && (
                            <span>Renews: {formatDate(sub.currentPeriodEnd)}</span>
                        )}
                    </div>
                </div>

                {/* Plan Comparison (toggle) */}
                {showPricing && tiers.length > 0 && (
                    <div className="rounded-2xl border border-border bg-bg-secondary p-6">
                        <h3 className="text-lg font-bold text-white mb-6">Change Plan</h3>
                        <PricingTiers
                            tiers={tiers}
                            currentTier={sub.tier}
                            onSubscribed={() => {
                                sub.refetch();
                                setShowPricing(false);
                            }}
                        />
                    </div>
                )}

                {/* Invoice History */}
                {invoices.length > 0 && (
                    <div className="rounded-2xl border border-border bg-bg-secondary p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-text-faint" />
                            Invoices
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-text-faint text-xs uppercase border-b border-border">
                                        <th className="text-left py-3 pr-4">Date</th>
                                        <th className="text-left py-3 pr-4">Amount</th>
                                        <th className="text-left py-3 pr-4">Status</th>
                                        <th className="text-right py-3" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((inv) => (
                                        <tr key={inv.id} className="border-b border-border/50 last:border-0">
                                            <td className="py-3 pr-4 text-white">
                                                {formatDate(inv.created)}
                                            </td>
                                            <td className="py-3 pr-4 text-white font-medium">
                                                {formatCurrency(inv.amount, inv.currency)}
                                            </td>
                                            <td className="py-3 pr-4">
                                                <span className={cn(
                                                    "badge",
                                                    inv.status === "paid" ? "badge-green" : "badge-amber"
                                                )}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {inv.hostedUrl && (
                                                        <a
                                                            href={inv.hostedUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn-icon"
                                                            aria-label="View invoice"
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </a>
                                                    )}
                                                    {inv.pdfUrl && (
                                                        <a
                                                            href={inv.pdfUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn-icon"
                                                            aria-label="Download PDF"
                                                        >
                                                            <Download className="w-3.5 h-3.5" />
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

function UsageBar({
    label,
    icon: Icon,
    current,
    limit,
}: {
    label: string;
    icon: React.ElementType;
    current: number;
    limit: number;
}) {
    const isUnlimited = limit === -1;
    const pct = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
    const isNearLimit = !isUnlimited && pct >= 80;

    return (
        <div className="p-3 rounded-xl bg-white/5">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Icon className="w-4 h-4" />
                    {label}
                </div>
                <span className={cn("text-sm font-medium", isNearLimit ? "text-brand-orange" : "text-white")}>
                    {current} / {isUnlimited ? "\u221e" : limit}
                </span>
            </div>
            {!isUnlimited && (
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                        className={cn(
                            "h-full rounded-full transition-[width] duration-300",
                            isNearLimit ? "bg-brand-orange" : "bg-brand-green"
                        )}
                        style={{ width: `${pct}%` }}
                    />
                </div>
            )}
        </div>
    );
}
