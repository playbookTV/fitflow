"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    Users,
    UserPlus,
    CreditCard,
    Crown,
    Clock,
    AlertTriangle,
    Activity,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatCard } from "@/components/admin/StatCard";
import { fetchOverview, type OverviewData } from "@/lib/admin-api";
import { formatCurrency } from "@/lib/tokens";
import { formatRelative } from "@/lib/utils";

const gridVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
};

const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export default function AdminOverviewPage() {
    const [data, setData] = useState<OverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchOverview()
            .then(setData)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    return (
        <AdminLayout title="Platform Overview" subtitle="FitFlow back office">
            {error && (
                <div className="p-4 mb-6 rounded-xl bg-brand-red/10 border border-brand-red/20 text-brand-red text-sm">
                    {error}
                </div>
            )}

            {/* KPI Cards */}
            <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8"
                variants={gridVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.div variants={cardVariants}>
                    <StatCard
                        label="Total Coaches"
                        value={data?.totalCoaches ?? 0}
                        icon={Users}
                        color="blue"
                        loading={loading}
                    />
                </motion.div>
                <motion.div variants={cardVariants}>
                    <StatCard
                        label="Total Clients"
                        value={data?.totalClients ?? 0}
                        icon={UserPlus}
                        color="green"
                        loading={loading}
                    />
                </motion.div>
                <motion.div variants={cardVariants}>
                    <StatCard
                        label="Active Subs"
                        value={data?.activeSubscriptions ?? 0}
                        icon={Crown}
                        color="violet"
                        loading={loading}
                    />
                </motion.div>
                <motion.div variants={cardVariants}>
                    <StatCard
                        label="MRR"
                        value={data ? formatCurrency(data.mrr) : "$0"}
                        icon={CreditCard}
                        color="orange"
                        loading={loading}
                    />
                </motion.div>
                <motion.div variants={cardVariants}>
                    <StatCard
                        label="Trialing"
                        value={data?.trialing ?? 0}
                        icon={Clock}
                        color="cyan"
                        loading={loading}
                    />
                </motion.div>
                <motion.div variants={cardVariants}>
                    <StatCard
                        label="Past Due"
                        value={data?.pastDue ?? 0}
                        icon={AlertTriangle}
                        color="red"
                        loading={loading}
                    />
                </motion.div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tier Breakdown */}
                <div className="card p-6">
                    <h2 className="text-sm font-semibold text-white mb-4">Subscription Tiers</h2>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="skeleton h-10 rounded-lg" />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {(["STARTER", "PRO", "STUDIO"] as const).map((tier) => {
                                const count = data?.tierBreakdown[tier] ?? 0;
                                const total = data?.activeSubscriptions ?? 1;
                                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                                const colors = {
                                    STARTER: "bg-brand-blue",
                                    PRO: "bg-brand-violet",
                                    STUDIO: "bg-brand-orange",
                                };
                                return (
                                    <div key={tier}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm text-text-secondary">{tier}</span>
                                            <span className="text-sm font-medium text-white tabular-nums">
                                                {count} ({pct}%)
                                            </span>
                                        </div>
                                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${colors[tier]}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Recent Signups */}
                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-white">Recent Signups</h2>
                        <Link
                            href="/admin/coaches"
                            className="text-xs text-brand-orange hover:underline"
                        >
                            View all
                        </Link>
                    </div>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="skeleton h-12 rounded-lg" />
                            ))}
                        </div>
                    ) : data?.recentCoaches.length === 0 ? (
                        <p className="text-sm text-text-faint py-4 text-center">No coaches yet</p>
                    ) : (
                        <div className="space-y-2">
                            {data?.recentCoaches.map((coach) => (
                                <Link
                                    key={coach.id}
                                    href={`/admin/coaches/${coach.id}`}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-white">
                                            {coach.name || coach.email}
                                        </p>
                                        <p className="text-xs text-text-faint">{coach.email}</p>
                                    </div>
                                    <span className="text-xs text-text-faint">
                                        {formatRelative(coach.createdAt)}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Activity */}
            <div className="card p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
                    <Link
                        href="/admin/activity"
                        className="text-xs text-brand-orange hover:underline"
                    >
                        View all
                    </Link>
                </div>
                {loading ? (
                    <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="skeleton h-10 rounded-lg" />
                        ))}
                    </div>
                ) : data?.recentEvents.length === 0 ? (
                    <p className="text-sm text-text-faint py-4 text-center">No events yet</p>
                ) : (
                    <div className="space-y-1">
                        {data?.recentEvents.map((event) => (
                            <div
                                key={event.id}
                                className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Activity className="w-4 h-4 text-text-faint shrink-0" />
                                    <span className="text-sm text-white">
                                        {event.eventType.replace(/[._]/g, " ")}
                                    </span>
                                </div>
                                <span className="text-xs text-text-faint">
                                    {formatRelative(event.createdAt)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
