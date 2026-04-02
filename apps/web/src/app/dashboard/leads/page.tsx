"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { UserPlus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Lead {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    channelTag: "WHATSAPP" | "TELEGRAM";
    source: string | null;
    status: "NEW" | "INTAKE_COMPLETE" | "PAYMENT_PENDING" | "CONVERTED" | "REJECTED";
    offer: { name: string; slug: string } | null;
    createdAt: string;
}

const STATUS_LABELS: Record<Lead["status"], string> = {
    NEW: "New",
    INTAKE_COMPLETE: "Intake Done",
    PAYMENT_PENDING: "Awaiting Payment",
    CONVERTED: "Converted",
    REJECTED: "Rejected",
};

const STATUS_COLORS: Record<Lead["status"], string> = {
    NEW: "badge-blue",
    INTAKE_COMPLETE: "badge-orange",
    PAYMENT_PENDING: "badge-violet",
    CONVERTED: "badge-green",
    REJECTED: "badge-red",
};

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [converting, setConverting] = useState<string | null>(null);

    const fetchLeads = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const url = statusFilter === "ALL"
                ? `${process.env.NEXT_PUBLIC_API_URL}/leads`
                : `${process.env.NEXT_PUBLIC_API_URL}/leads?status=${statusFilter}`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setLeads(await res.json());
        } catch (error) {
            console.error("Failed to fetch leads:", error);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { fetchLeads(); }, [fetchLeads]);

    const handleConvert = async (leadId: string) => {
        setConverting(leadId);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/leads/${leadId}/convert`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            if (res.ok) fetchLeads();
        } catch (error) {
            console.error("Failed to convert lead:", error);
        } finally {
            setConverting(null);
        }
    };

    const filters = ["ALL", "NEW", "INTAKE_COMPLETE", "PAYMENT_PENDING", "CONVERTED"];

    return (
        <DashboardLayout
            title="Lead Pipeline"
            subtitle="Track and convert incoming leads"
        >
            {/* Status Filters */}
            <div className="flex gap-2 mb-6 flex-wrap">
                {filters.map((f) => (
                    <button
                        key={f}
                        onClick={() => setStatusFilter(f)}
                        className={cn(
                            "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                            statusFilter === f
                                ? "bg-brand-green/10 text-brand-green border border-brand-green/20"
                                : "bg-bg-hover text-text-secondary hover:text-white"
                        )}
                    >
                        {f === "ALL" ? "All" : STATUS_LABELS[f as Lead["status"]]}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="skeleton h-20 rounded-2xl" />
                    ))}
                </div>
            ) : leads.length === 0 ? (
                <div className="empty-state">
                    <UserPlus className="w-12 h-12 text-text-faint mx-auto mb-4" />
                    <p className="text-text-secondary mb-2">No leads yet</p>
                    <p className="text-text-faint text-sm">
                        Share your offer links to start capturing leads.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {leads.map((lead) => (
                        <div
                            key={lead.id}
                            className="card p-5 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-bg-hover flex items-center justify-center text-text-secondary font-semibold text-sm">
                                    {lead.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-medium text-white truncate">{lead.name}</p>
                                    <div className="flex items-center gap-2 text-sm text-text-faint">
                                        <span className="text-xs font-mono uppercase">
                                            {lead.channelTag === "WHATSAPP" ? "WA" : "TG"}
                                        </span>
                                        {lead.source && (
                                            <>
                                                <span className="text-text-muted">·</span>
                                                <span>{lead.source}</span>
                                            </>
                                        )}
                                        {lead.offer && (
                                            <>
                                                <span className="text-text-muted">·</span>
                                                <span>{lead.offer.name}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={cn("badge", STATUS_COLORS[lead.status])}>
                                    {STATUS_LABELS[lead.status]}
                                </span>
                                {lead.status !== "CONVERTED" && lead.status !== "REJECTED" && (
                                    <button
                                        onClick={() => handleConvert(lead.id)}
                                        disabled={converting === lead.id}
                                        className="btn-ghost text-brand-green hover:text-brand-green flex items-center gap-1 text-sm"
                                    >
                                        Convert
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}
