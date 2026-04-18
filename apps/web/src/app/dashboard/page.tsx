"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardStats } from "@/components/DashboardStats";
import { ClientGrid } from "@/components/ClientGrid";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RiskScoreCard } from "@/components/RiskScoreCard";
import { Search, Filter, RefreshCcw, MessageSquare, Plus, Send, UserPlus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/auth";

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

    const router = useRouter();

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

            if (statsRes.ok) setStats(await statsRes.json());
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

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                            placeholder="Search clients\u2026"
                            name="search"
                            autoComplete="off"
                            aria-label="Search clients"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-with-icon w-48"
                        />
                    </div>
                    <button className="btn-icon hidden sm:flex" aria-label="Filter">
                        <Filter className="w-4 h-4" aria-hidden="true" />
                    </button>
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

                {/* Stats */}
                <DashboardStats stats={stats} loading={loading} />

                {/* Channel Breakdown & Leads */}
                {!loading && (stats.channels || stats.newLeads) && (
                    <div className="flex flex-wrap gap-4 mb-10 animate-fade-in">
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
                    <div className="mb-10 animate-fade-in">
                        <div className="section-header">
                            <h2 className="section-title flex items-center gap-2 text-balance">
                                <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse-glow" />
                                Needs Attention
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {stats.atRiskClients.map((client) => (
                                <RiskScoreCard key={client.id} client={client} />
                            ))}
                        </div>
                    </div>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
