"use client";

import { cn } from "@/lib/utils";

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
    red: {
        bg: "bg-brand-red-glow",
        text: "text-brand-red",
        border: "border-brand-red-border",
        glow: "group-hover:shadow-glow",
    },
};

interface StatCardProps {
    label: string;
    value: string | number;
    icon: React.ElementType;
    color: keyof typeof colorMap;
    loading?: boolean;
}

export function StatCard({ label, value, icon: Icon, color, loading }: StatCardProps) {
    const colors = colorMap[color];

    if (loading) {
        return (
            <div className="stat-card">
                <div className="flex items-center justify-between mb-4">
                    <div className="skeleton w-10 h-10 rounded-xl" />
                </div>
                <div className="skeleton w-20 h-4 rounded mb-2" />
                <div className="skeleton w-16 h-8 rounded" />
            </div>
        );
    }

    return (
        <div
            className={cn(
                "stat-card group transition-[color,background-color,border-color,box-shadow,transform] duration-200 hover:border-white/10",
                colors.glow
            )}
        >
            <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2.5 rounded-xl border", colors.bg, colors.border)}>
                    <Icon className={cn("w-5 h-5", colors.text)} aria-hidden="true" />
                </div>
            </div>
            <p className="label-mono mb-1">{label}</p>
            <p className="text-2xl font-bold text-white tabular-nums tracking-tight">{value}</p>
        </div>
    );
}
