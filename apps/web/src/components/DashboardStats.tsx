"use client";

import { Users, Activity, CheckCircle2, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/tokens";

const gridVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

interface StatItemProps {
    label: string;
    value: string | number;
    icon: React.ElementType;
    trend?: string;
    trendUp?: boolean;
    color: "green" | "blue" | "violet" | "orange" | "cyan";
    loading?: boolean;
}

const colorMap = {
    green: {
        bg: "bg-brand-green-glow",
        text: "text-brand-green",
        border: "border-brand-green-border",
        glow: "group-hover:shadow-glow",
    },
    blue: {
        bg: "bg-brand-blue-glow",
        text: "text-brand-blue",
        border: "border-brand-blue-border",
        glow: "group-hover:shadow-glow-blue",
    },
    violet: {
        bg: "bg-brand-violet-glow",
        text: "text-brand-violet",
        border: "border-brand-violet-border",
        glow: "group-hover:shadow-glow-violet",
    },
    orange: {
        bg: "bg-brand-orange-glow",
        text: "text-brand-orange",
        border: "border-brand-orange-border",
        glow: "group-hover:shadow-glow",
    },
    cyan: {
        bg: "bg-brand-cyan-glow",
        text: "text-brand-cyan",
        border: "border-brand-cyan-border",
        glow: "group-hover:shadow-glow",
    },
};

const StatItem = ({ label, value, icon: Icon, trend, trendUp = true, color, loading }: StatItemProps) => {
    const colors = colorMap[color];

    if (loading) {
        return (
            <div className="stat-card">
                <div className="flex items-center justify-between mb-4">
                    <div className="skeleton w-10 h-10 rounded-xl" />
                    <div className="skeleton w-12 h-5 rounded-lg" />
                </div>
                <div className="skeleton w-20 h-4 rounded mb-2" />
                <div className="skeleton w-16 h-8 rounded" />
            </div>
        );
    }

    return (
        <div className={cn(
            "stat-card group transition-[color,background-color,border-color,box-shadow,transform] duration-200 hover:border-white/10",
            colors.glow
        )}>
            <div className="flex items-center justify-between mb-4">
                <div className={cn(
                    "p-2.5 rounded-xl border",
                    colors.bg,
                    colors.border
                )}>
                    <Icon className={cn("w-5 h-5", colors.text)} aria-hidden="true" />
                </div>
                {trend && (
                    <span className={cn(
                        "text-[10px] font-bold tracking-wider px-2 py-1 rounded-lg border",
                        trendUp
                            ? "text-brand-green bg-brand-green-glow border-brand-green-border"
                            : "text-brand-red bg-brand-red-glow border-brand-red-border"
                    )}>
                        {trend}
                    </span>
                )}
            </div>
            <p className="label-mono mb-1">{label}</p>
            <p className="text-2xl font-bold text-white tabular-nums tracking-tight">
                {value}
            </p>
        </div>
    );
};

interface DashboardStatsProps {
    stats: {
        totalClients: number;
        activePlans: number;
        totalWorkouts: number;
        averageCompliance: number;
        revenue: number;
    };
    loading?: boolean;
}

export const DashboardStats = ({ stats, loading }: DashboardStatsProps) => {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatItem label="Total Clients" value={0} icon={Users} color="blue" loading />
                <StatItem label="Active Plans" value={0} icon={Activity} color="violet" loading />
                <StatItem label="Avg Compliance" value="0%" icon={CheckCircle2} color="green" loading />
                <StatItem label="Est. Revenue" value="£0" icon={TrendingUp} color="orange" loading />
            </div>
        );
    }

    return (
        <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10"
            variants={gridVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div variants={cardVariants}>
                <StatItem label="Total Clients" value={stats.totalClients} icon={Users} trend="+12%" trendUp color="blue" />
            </motion.div>
            <motion.div variants={cardVariants}>
                <StatItem label="Active Plans" value={stats.activePlans} icon={Activity} color="violet" />
            </motion.div>
            <motion.div variants={cardVariants}>
                <StatItem label="Avg Compliance" value={`${stats.averageCompliance}%`} icon={CheckCircle2} trend="+5%" trendUp color="green" />
            </motion.div>
            <motion.div variants={cardVariants}>
                <StatItem label="Est. Revenue" value={formatCurrency(stats.revenue)} icon={TrendingUp} color="orange" />
            </motion.div>
        </motion.div>
    );
};
