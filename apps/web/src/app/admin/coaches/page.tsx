"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { fetchCoaches, type CoachListItem, type CoachListResponse } from "@/lib/admin-api";
import { formatCurrency } from "@/lib/tokens";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: "text-brand-green bg-brand-green/10",
    TRIALING: "text-brand-cyan bg-brand-cyan/10",
    PAST_DUE: "text-brand-orange bg-brand-orange/10",
    CANCELED: "text-brand-red bg-brand-red/10",
    UNPAID: "text-brand-red bg-brand-red/10",
};

const TIER_COLORS: Record<string, string> = {
    STARTER: "text-brand-blue bg-brand-blue/10",
    PRO: "text-brand-violet bg-brand-violet/10",
    STUDIO: "text-brand-orange bg-brand-orange/10",
};

export default function AdminCoachesPage() {
    const [data, setData] = useState<CoachListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [tier, setTier] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetchCoaches({ page, search, tier, status, limit: 25 });
            setData(result);
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    }, [page, search, tier, status]);

    useEffect(() => {
        load();
    }, [load]);

    // Debounce search
    const [searchInput, setSearchInput] = useState("");
    useEffect(() => {
        const t = setTimeout(() => {
            setSearch(searchInput);
            setPage(1);
        }, 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    return (
        <AdminLayout title="Coaches" subtitle={data ? `${data.total} total` : undefined}>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or business..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="input pl-10 w-full"
                    />
                </div>
                <select
                    value={tier}
                    onChange={(e) => { setTier(e.target.value); setPage(1); }}
                    className="input w-full sm:w-40"
                >
                    <option value="">All Tiers</option>
                    <option value="STARTER">Starter</option>
                    <option value="PRO">Pro</option>
                    <option value="STUDIO">Studio</option>
                </select>
                <select
                    value={status}
                    onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                    className="input w-full sm:w-40"
                >
                    <option value="">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="TRIALING">Trialing</option>
                    <option value="PAST_DUE">Past Due</option>
                    <option value="CANCELED">Canceled</option>
                </select>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left text-xs font-medium text-text-faint uppercase tracking-wider px-4 py-3">Coach</th>
                                <th className="text-left text-xs font-medium text-text-faint uppercase tracking-wider px-4 py-3">Tier</th>
                                <th className="text-left text-xs font-medium text-text-faint uppercase tracking-wider px-4 py-3">Status</th>
                                <th className="text-right text-xs font-medium text-text-faint uppercase tracking-wider px-4 py-3">Clients</th>
                                <th className="text-right text-xs font-medium text-text-faint uppercase tracking-wider px-4 py-3">Revenue</th>
                                <th className="text-right text-xs font-medium text-text-faint uppercase tracking-wider px-4 py-3">Joined</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="border-b border-border/50">
                                        <td className="px-4 py-3"><div className="skeleton h-8 w-48 rounded" /></td>
                                        <td className="px-4 py-3"><div className="skeleton h-6 w-16 rounded" /></td>
                                        <td className="px-4 py-3"><div className="skeleton h-6 w-16 rounded" /></td>
                                        <td className="px-4 py-3"><div className="skeleton h-6 w-10 rounded ml-auto" /></td>
                                        <td className="px-4 py-3"><div className="skeleton h-6 w-16 rounded ml-auto" /></td>
                                        <td className="px-4 py-3"><div className="skeleton h-6 w-20 rounded ml-auto" /></td>
                                    </tr>
                                ))
                            ) : data?.coaches.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-text-faint">
                                        No coaches found
                                    </td>
                                </tr>
                            ) : (
                                data?.coaches.map((coach) => (
                                    <tr
                                        key={coach.id}
                                        className="border-b border-border/50 hover:bg-white/[0.02] transition-colors"
                                    >
                                        <td className="px-4 py-3">
                                            <Link
                                                href={`/admin/coaches/${coach.id}`}
                                                className="hover:underline"
                                            >
                                                <p className="text-sm font-medium text-white">
                                                    {coach.name || coach.email}
                                                </p>
                                                <p className="text-xs text-text-faint">{coach.email}</p>
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3">
                                            {coach.subscription ? (
                                                <span className={cn(
                                                    "text-xs font-medium px-2 py-1 rounded-lg",
                                                    TIER_COLORS[coach.subscription.tier] || "text-text-faint bg-white/5"
                                                )}>
                                                    {coach.subscription.tier}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-text-faint">No sub</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {coach.subscription ? (
                                                <span className={cn(
                                                    "text-xs font-medium px-2 py-1 rounded-lg",
                                                    STATUS_COLORS[coach.subscription.status] || "text-text-faint bg-white/5"
                                                )}>
                                                    {coach.subscription.status}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-text-faint">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-sm text-white tabular-nums">{coach.clientCount}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-sm text-white tabular-nums">
                                                {formatCurrency(coach.revenue, coach.billingCurrency.toUpperCase())}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-xs text-text-faint">
                                                {new Date(coach.createdAt).toLocaleDateString()}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {data && data.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                        <p className="text-xs text-text-faint">
                            Page {data.page} of {data.totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="btn-icon disabled:opacity-30"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                                disabled={page >= data.totalPages}
                                className="btn-icon disabled:opacity-30"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
