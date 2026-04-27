"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardStats } from "@/components/DashboardStats";
import { ClientGrid } from "@/components/ClientGrid";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RiskScoreCard } from "@/components/RiskScoreCard";
import { Search, Filter, RefreshCcw, MessageSquare, Plus, Send, UserPlus, BarChart3, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/auth";
import { useSubscription } from "@/hooks/useSubscription";

interface AtRiskClient {
    id: string;
    name: string;
    score?: number;
    level?: string;
    summary?: string;
    suggestion?: string;
    factors?: {
        compliance: number;
        engagement: number;
        activity: number;
        behavioral: number;
        payment: number;
    };
}

interface Stats {
    totalClients: number;
    activePlans: number;
    totalWorkouts: number;
    averageCompliance: number;
    revenue: number;
    atRiskClients: AtRiskClient[];
    channels?: { whatsapp: number; telegram: number };
    newLeads?: number;
}

interface Client {
    id: string;
    name: string;
    status: string;
    phone: string | null;
    email?: string;
    goals?: string;
    preferredChannel?: "WHATSAPP" | "TELEGRAM";
    telegramChatId?: string | null;
}

const STATUS_OPTIONS = [
    { value: "", label: "All Statuses" },
    { value: "ACTIVE", label: "Active" },
    { value: "PENDING_PAYMENT", label: "Pending Payment" },
    { value: "INTAKE_SENT", label: "Intake Sent" },
    { value: "INTAKE_COMPLETE", label: "Intake Complete" },
    { value: "PLAN_ASSIGNED", label: "Plan Assigned" },
    { value: "PAUSED", label: "Paused" },
    { value: "INACTIVE", label: "Inactive" },
];

export default function DashboardPage() {
    const [stats, setStats] = useState<Stats>({
        totalClients: 0,
        activePlans: 0,
        totalWorkouts: 0,
        averageCompliance: 0,
        revenue: 0,
        atRiskClients: [],
    });
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [analyticsLocked, setAnalyticsLocked] = useState(false);
    const [analyticsLockCode, setAnalyticsLockCode] = useState<string | null>(null);

    const router = useRouter();
    const { isTrialing } = useSubscription();

    const fetchData = async () => {
        setLoading(true);
        try {
            const headers = await getAuthHeaders();
            const [statsRes, clientsRes, coachRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/summary`, {
                    headers,
                }),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients`, {
                    headers,
                }),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/coaches/me`, {
                    headers,
                }),
            ]);

            if (coachRes.ok) {
                const coach = await coachRes.json();
                if (!coach.onboardingCompleted) {
                    router.replace("/setup");
                    return;
                }
            }

            if (statsRes.ok) {
                setStats(await statsRes.json());
                setAnalyticsLocked(false);
            } else if (statsRes.status === 403) {
                setAnalyticsLocked(true);
                try {
                    const body = await statsRes.json();
                    setAnalyticsLockCode(body.code ?? null);
                } catch {
                    setAnalyticsLockCode(null);
                }
            }
            if (clientsRes.ok) setClients(await clientsRes.json());
        } catch (error) {
            console.error("Dashboard fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredClients = clients.filter(client => {
        const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = !statusFilter || client.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getAnalyticsBannerCopy = () => {
        if (analyticsLockCode === "NO_SUBSCRIPTION") {
            return {
                title: "Analytics requires a subscription",
                subtitle: "Subscribe to a Pro or Studio plan to unlock compliance tracking, revenue insights, and at-risk client alerts.",
            };
        }
        if (isTrialing) {
            return {
                title: "Analytics is available on Pro and Studio plans",
                subtitle: "Your free trial is on the Starter plan. Upgrade to Pro to unlock compliance tracking, revenue insights, and at-risk client alerts.",
            };
        }
        return {
            title: "Analytics is available on Pro and Studio plans",
            subtitle: "Upgrade your Starter plan to unlock compliance tracking, revenue insights, and at-risk client alerts.",
        };
    };

    const bannerCopy = analyticsLocked ? getAnalyticsBannerCopy() : null;

    return (
        <DashboardLayout
            title="Overview"
            subtitle="Manage your roster and track performance"
            notifications={stats.atRiskClients?.length || 0}
            actions={
                <div className="flex items-center gap-3">
                    <div className="relative hidden md:block">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" aria-hidden="true" />
                        <input
                            type="text"
                            placeholder="Search clients…"
                            name="search"
                            autoComplete="off"
                            aria-label="Search clients"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-with-icon w-48"
                        />
                    </div>
                    <div className="relative hidden sm:block">
                        <button
                            className={cn("btn-icon", statusFilter && "text-brand-violet")}
                            aria-label="Filter by status"
                            onClick={() => setShowFilterMenu((v) => !v)}
                        >
                            <Filter className="w-4 h-4" aria-hidden="true" />
                        </button>
                        {showFilterMenu && (
                            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-bg-card border border-border shadow-lg z-50 py-1">
                                {STATUS_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        className={cn(
                                            "w-full text-left px-4 py-2 text-sm hover:bg-bg-hover transition-colors",
                                            statusFilter === opt.value ? "text-brand-violet font-medium" : "text-text-secondary"
                                        )}
                                        onClick={() => {
                                            setStatusFilter(opt.value);
                                            setShowFilterMenu(false);
                                        }}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={fetchData}
                        className="btn-icon"
                        disabled={loading}
                        aria-label="Refresh"
                    >
                        <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} aria-hidden="true" />
                    </button>
                    <Link href="/dashboard/clients/new" className="btn-primary">
                        <Plus className="w-4 h-4" aria-hidden="true" />
                        <span className="hidden sm:inline">ADD CLIENT</span>
                    </Link>
                </div>
            }
        >

                {/* Stats or Upgrade Prompt */}
                {analyticsLocked && !loading ? (
                    <div className="card p-4 sm:p-6 mb-6 sm:mb-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 border-brand-violet/20 bg-brand-violet/5">
                        <div className="p-3 rounded-xl bg-brand-violet-glow border border-brand-violet-border">
                            <BarChart3 className="w-5 h-5 text-brand-violet" aria-hidden="true" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-white mb-0.5">
                                {bannerCopy?.title}
                            </p>
                            <p className="text-sm text-text-secondary">
                                {bannerCopy?.subtitle}
                            </p>
                        </div>
                        <Link
                            href="/dashboard/subscription"
                            className="btn-primary shrink-0"
                        >
                            Upgrade
                            <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                        </Link>
                    </div>
                ) : (
                    <>
                        <DashboardStats stats={stats} loading={loading} />

                        {/* Channel Breakdown & Leads */}
                        {!loading && (stats.channels || stats.newLeads) && (
                            <div className="flex flex-wrap gap-3 sm:gap-4 mb-6 sm:mb-10 animate-fade-in">
                                {stats.channels && (
                                    <div className="card p-4 flex items-center gap-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <MessageSquare className="w-4 h-4 text-brand-green" aria-hidden="true" />
                                            <span className="text-text-secondary">WhatsApp</span>
                                            <span className="font-bold text-white tabular-nums">{stats.channels.whatsapp}</span>
                                        </div>
                                        <div className="w-px h-6 bg-border" />
                                        <div className="flex items-center gap-2 text-sm">
                                            <Send className="w-4 h-4 text-brand-blue" aria-hidden="true" />
                                            <span className="text-text-secondary">Telegram</span>
                                            <span className="font-bold text-white tabular-nums">{stats.channels.telegram}</span>
                                        </div>
                                    </div>
                                )}
                                {(stats.newLeads ?? 0) > 0 && (
                                    <Link
                                        href="/dashboard/leads"
                                        className="card p-4 flex items-center gap-3 hover:border-brand-orange/30 transition-colors"
                                    >
                                        <UserPlus className="w-4 h-4 text-brand-orange" aria-hidden="true" />
                                        <span className="text-sm text-text-secondary">New Leads</span>
                                        <span className="badge badge-orange">{stats.newLeads}</span>
                                    </Link>
                                )}
                            </div>
                        )}

                        {/* At Risk Alerts */}
                        {stats.atRiskClients?.length > 0 && (
                            <div className="mb-6 sm:mb-10 animate-fade-in">
                                <div className="section-header">
                                    <h2 className="section-title flex items-center gap-2 text-balance">
                                        <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse-glow" />
                                        Needs Attention
                                    </h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                    {stats.atRiskClients.map((client) => (
                                        <RiskScoreCard key={client.id} client={client} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Client Roster */}
                <div className="mb-6">
                    <div className="section-header">
                        <h2 className="section-title text-balance">Active Roster</h2>
                        <span className="badge badge-blue">
                            {filteredClients.length} Clients
                        </span>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="skeleton h-44 rounded-2xl" />
                            ))}
                        </div>
                    ) : filteredClients.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <Search className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1 text-balance">
                                {searchQuery ? "No matches found" : "No clients yet"}
                            </h3>
                            <p className="text-text-secondary text-sm mb-6 text-pretty">
                                {searchQuery
                                    ? "Try a different search term"
                                    : "Add your first client to get started"}
                            </p>
                            {!searchQuery && (
                                <Link href="/dashboard/clients/new" className="btn-primary">
                                    <Plus className="w-4 h-4" aria-hidden="true" />
                                    ADD CLIENT
                                </Link>
                            )}
                        </div>
                    ) : (
                        <ClientGrid clients={filteredClients} />
                    )}
                </div>
        </DashboardLayout>
    );
}
