"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";

interface RiskScoreCardProps {
    client: {
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
    };
}

const LEVEL_STYLES: Record<string, { badge: string; borderColor: string; label: string }> = {
    CRITICAL: { badge: "bg-brand-red text-white", borderColor: "rgba(239,68,68,0.4)", label: "CRITICAL" },
    HIGH: { badge: "bg-brand-orange text-white", borderColor: "rgba(249,115,22,0.4)", label: "HIGH" },
    MODERATE: { badge: "bg-yellow-500 text-black", borderColor: "rgba(234,179,8,0.4)", label: "MODERATE" },
    LOW: { badge: "bg-brand-green text-black", borderColor: "rgba(34,197,94,0.4)", label: "LOW" },
};

function FactorBar({ label, value }: { label: string; value: number }) {
    const width = Math.max(2, Math.min(100, value));
    const color = value >= 70 ? "bg-brand-red" : value >= 40 ? "bg-yellow-500" : "bg-brand-green";

    return (
        <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-text-faint w-20 uppercase tracking-wider">{label}</span>
            <div className="flex-1 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full ${color} transition-[width] duration-300`}
                    style={{ width: `${width}%` }}
                />
            </div>
        </div>
    );
}

export function RiskScoreCard({ client }: RiskScoreCardProps) {
    const style = LEVEL_STYLES[client.level || ""] || LEVEL_STYLES.LOW;
    const hasRiskData = client.score != null;

    return (
        <Link
            href={`/dashboard/clients/${client.id}`}
            className="card group cursor-pointer transition-[color,background-color,border-color,box-shadow,transform] duration-200 p-4"
            style={{ ["--hover-border" as string]: style.borderColor }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = style.borderColor; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = ""; }}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{client.name}</p>
                    {hasRiskData ? (
                        <span className={`inline-block mt-1 text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-full ${style.badge}`}>
                            {style.label} — {client.score}
                        </span>
                    ) : (
                        <p className="text-brand-red/70 text-[10px] uppercase tracking-widest font-bold mt-1">
                            No check-in (7 days)
                        </p>
                    )}
                </div>
                <button
                    aria-label={`Message ${client.name}`}
                    className="btn-icon border-brand-red/20 text-brand-red hover:bg-brand-red hover:text-white transition-[color,background-color,border-color,box-shadow,transform] duration-200 shrink-0"
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                >
                    <MessageSquare className="w-4 h-4" aria-hidden="true" />
                </button>
            </div>

            {client.summary && (
                <p className="text-xs text-text-secondary line-clamp-2 mb-3">
                    {client.summary}
                </p>
            )}

            {client.factors && (
                <div className="space-y-1.5">
                    <FactorBar label="Compliance" value={client.factors.compliance} />
                    <FactorBar label="Engagement" value={client.factors.engagement} />
                    <FactorBar label="Activity" value={client.factors.activity} />
                    <FactorBar label="Behavioral" value={client.factors.behavioral} />
                </div>
            )}
        </Link>
    );
}
