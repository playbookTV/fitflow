"use client";

import { useEffect, useState } from "react";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { CreditCard, TrendingUp, AlertTriangle, Activity } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatCard } from "@/components/admin/StatCard";
import { fetchRevenue, type RevenueData } from "@/lib/admin-api";
import { formatCurrency } from "@/lib/tokens";
import { formatRelative } from "@/lib/utils";

export default function AdminRevenuePage() {
    const [data, setData] = useState<RevenueData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchRevenue()
            .then(setData)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const chartData = data?.monthlyRevenue.map((m) => ({
        month: m.month.slice(5), // "01", "02", etc.
        revenue: m.amount / 100,
    })) ?? [];

    const tierChartData = data
        ? [
            { tier: "Starter", mrr: data.mrrByTier.STARTER / 100 },
            { tier: "Pro", mrr: data.mrrByTier.PRO / 100 },
            { tier: "Studio", mrr: data.mrrByTier.STUDIO / 100 },
        ]
        : [];

    return (
        <AdminLayout title="Revenue" subtitle="Subscription and payment metrics">
            {error && (
                <div className="p-4 mb-6 rounded-xl bg-brand-red/10 border border-brand-red/20 text-brand-red text-sm">
                    {error}
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    label="MRR"
                    value={data ? formatCurrency(data.mrr) : "$0"}
                    icon={TrendingUp}
                    color="green"
                    loading={loading}
                />
                <StatCard
                    label="Stripe Volume"
                    value={data ? formatCurrency(data.paymentVolume.stripe.total) : "$0"}
                    icon={CreditCard}
                    color="violet"
                    loading={loading}
                />
                <StatCard
                    label="Bank Transfers"
                    value={data ? formatCurrency(data.paymentVolume.bankTransfer.total) : "$0"}
                    icon={CreditCard}
                    color="blue"
                    loading={loading}
                />
                <StatCard
                    label="Churn (30d)"
                    value={data?.churn.last30Days ?? 0}
                    icon={AlertTriangle}
                    color="red"
                    loading={loading}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Revenue Over Time */}
                <div className="card p-6">
                    <h2 className="text-sm font-semibold text-white mb-4">Payment Revenue (12 months)</h2>
                    {loading ? (
                        <div className="skeleton h-64 rounded-xl" />
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                                <YAxis stroke="#6b7280" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#1a1a2e",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: "12px",
                                        color: "#fff",
                                        fontSize: "12px",
                                    }}
                                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* MRR by Tier */}
                <div className="card p-6">
                    <h2 className="text-sm font-semibold text-white mb-4">MRR by Tier</h2>
                    {loading ? (
                        <div className="skeleton h-64 rounded-xl" />
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={tierChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="tier" stroke="#6b7280" fontSize={12} />
                                <YAxis stroke="#6b7280" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#1a1a2e",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: "12px",
                                        color: "#fff",
                                        fontSize: "12px",
                                    }}
                                    formatter={(value: number) => [`$${value.toFixed(2)}`, "MRR"]}
                                />
                                <Bar dataKey="mrr" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Churn breakdown + Recent changes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Churn */}
                <div className="card p-6">
                    <h2 className="text-sm font-semibold text-white mb-4">Subscription Churn</h2>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {[
                                { label: "Last 30 days", value: data?.churn.last30Days ?? 0 },
                                { label: "Last 60 days", value: data?.churn.last60Days ?? 0 },
                                { label: "Last 90 days", value: data?.churn.last90Days ?? 0 },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center justify-between">
                                    <span className="text-sm text-text-secondary">{item.label}</span>
                                    <span className="text-sm font-medium text-white tabular-nums">
                                        {item.value} canceled
                                    </span>
                                </div>
                            ))}
                            <div className="pt-3 border-t border-border">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-text-secondary">Payment methods</span>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-xs text-text-faint">Stripe payments</span>
                                    <span className="text-xs text-white tabular-nums">{data?.paymentVolume.stripe.count ?? 0}</span>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-text-faint">Bank transfers</span>
                                    <span className="text-xs text-white tabular-nums">{data?.paymentVolume.bankTransfer.count ?? 0}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Recent Subscription Changes */}
                <div className="card p-6">
                    <h2 className="text-sm font-semibold text-white mb-4">Recent Subscription Changes</h2>
                    {loading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
                        </div>
                    ) : data?.recentChanges.length === 0 ? (
                        <p className="text-sm text-text-faint py-4 text-center">No recent changes</p>
                    ) : (
                        <div className="space-y-1">
                            {data?.recentChanges.map((event) => (
                                <div
                                    key={event.id}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <Activity className="w-4 h-4 text-text-faint shrink-0" />
                                        <div>
                                            <span className="text-sm text-white">
                                                {event.eventType.replace(/[._]/g, " ")}
                                            </span>
                                            {event.coachName && (
                                                <p className="text-xs text-text-faint">{event.coachName}</p>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-xs text-text-faint">
                                        {formatRelative(event.createdAt)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
