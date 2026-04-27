"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
    ArrowLeft,
    Link2,
    Users,
    Copy,
    Check,
    MessageCircle,
    Calendar,
    Loader2,
} from "lucide-react";
import { cn, formatDate, formatRelative } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/auth";

interface Lead {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    channelTag: "WHATSAPP" | "TELEGRAM";
    status: string;
    createdAt: string;
}

interface OfferDetail {
    id: string;
    name: string;
    slug: string;
    channelParam: string | null;
    ctaType: string | null;
    paymentRoute: string | null;
    isActive: boolean;
    sourceTags: string[];
    leads: Lead[];
    _count: { leads: number };
    createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
    NEW: { label: "New", className: "badge-blue" },
    INTAKE_COMPLETE: { label: "Intake Complete", className: "badge-green" },
    CONVERTED: { label: "Converted", className: "badge-green" },
    STALE: { label: "Stale", className: "badge-amber" },
};

export default function OfferDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [offer, setOffer] = useState<OfferDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [coachSlug, setCoachSlug] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const headers = await getAuthHeaders();
                const [offerRes, coachRes] = await Promise.all([
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/offers/${params.id}`, { headers }),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/coaches/me`, { headers }),
                ]);
                if (offerRes.ok) setOffer(await offerRes.json());
                if (coachRes.ok) {
                    const coach = await coachRes.json();
                    setCoachSlug(coach.slug || null);
                }
            } catch (error) {
                console.error("Failed to fetch offer:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [params.id]);

    const offerUrl = offer
        ? `${window.location.origin}${coachSlug ? `/${coachSlug}/${offer.slug}` : `/${offer.slug}`}`
        : "";

    const handleCopy = () => {
        navigator.clipboard.writeText(offerUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <DashboardLayout title="Offer">
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-text-faint" />
                </div>
            </DashboardLayout>
        );
    }

    if (!offer) {
        return (
            <DashboardLayout title="Offer Not Found">
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <Link2 className="w-6 h-6" />
                    </div>
                    <h3>Offer not found</h3>
                    <p className="text-text-secondary text-sm mb-4">This offer may have been deleted.</p>
                    <button onClick={() => router.push("/dashboard/offers")} className="btn-primary">
                        Back to Offers
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            title={offer.name}
            actions={
                <button
                    onClick={() => router.push("/dashboard/offers")}
                    className="btn-ghost"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>
            }
        >
            <div className="max-w-4xl space-y-4 sm:space-y-6">
                {/* Offer Info Card */}
                <div className="card p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                offer.isActive
                                    ? "bg-brand-green/10 text-brand-green"
                                    : "bg-bg-hover text-text-faint"
                            )}>
                                <Link2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">{offer.name}</h2>
                                <p className="text-sm text-text-faint font-mono">
                                    {coachSlug ? `/${coachSlug}/${offer.slug}` : `/${offer.slug}`}
                                </p>
                            </div>
                        </div>
                        <span className={cn("badge", offer.isActive ? "badge-green" : "badge-amber")}>
                            {offer.isActive ? "Active" : "Inactive"}
                        </span>
                    </div>

                    {/* Link + Copy */}
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-bg-hover mb-4">
                        <code className="text-sm text-brand-green font-mono flex-1 truncate">{offerUrl}</code>
                        <button onClick={handleCopy} className="btn-ghost !p-2 shrink-0" aria-label="Copy link">
                            {copied ? <Check className="w-4 h-4 text-brand-green" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 sm:gap-6 flex-wrap text-sm text-text-secondary">
                        <span className="flex items-center gap-1.5">
                            <Users className="w-4 h-4" />
                            {offer._count.leads} lead{offer._count.leads !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            Created {formatDate(offer.createdAt)}
                        </span>
                        {offer.channelParam && (
                            <span className="flex items-center gap-1.5">
                                <MessageCircle className="w-4 h-4" />
                                {offer.channelParam === "WHATSAPP" ? "WhatsApp" : "Telegram"}
                            </span>
                        )}
                    </div>
                </div>

                {/* Leads Table */}
                <div className="card p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-text-faint" />
                        Leads ({offer._count.leads})
                    </h3>

                    {offer.leads.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-text-faint text-sm">
                                No leads yet. Share your offer link to start capturing leads.
                            </p>
                        </div>
                    ) : (
                        <>
                        {/* Desktop: table view */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-text-faint text-xs uppercase border-b border-border">
                                        <th className="text-left py-3 pr-4">Name</th>
                                        <th className="text-left py-3 pr-4">Contact</th>
                                        <th className="text-left py-3 pr-4">Channel</th>
                                        <th className="text-left py-3 pr-4">Status</th>
                                        <th className="text-right py-3">Signed Up</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {offer.leads.map((lead) => {
                                        const statusConfig = STATUS_LABELS[lead.status] || { label: lead.status, className: "badge-blue" };
                                        return (
                                            <tr key={lead.id} className="border-b border-border/50 last:border-0">
                                                <td className="py-3 pr-4 text-white font-medium">{lead.name}</td>
                                                <td className="py-3 pr-4 text-text-secondary">
                                                    {lead.email || lead.phone || "—"}
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <span className={cn(
                                                        "text-xs font-bold",
                                                        lead.channelTag === "TELEGRAM" ? "text-brand-blue" : "text-brand-green"
                                                    )}>
                                                        {lead.channelTag === "TELEGRAM" ? "TG" : "WA"}
                                                    </span>
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <span className={cn("badge", statusConfig.className)}>
                                                        {statusConfig.label}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-right text-text-faint text-xs">
                                                    {formatRelative(lead.createdAt)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {/* Mobile: card view */}
                        <div className="sm:hidden space-y-3">
                            {offer.leads.map((lead) => {
                                const statusConfig = STATUS_LABELS[lead.status] || { label: lead.status, className: "badge-blue" };
                                return (
                                    <div key={lead.id} className="p-3 rounded-xl bg-bg-hover border border-border/50 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-white">{lead.name}</span>
                                            <span className={cn(
                                                "text-xs font-bold",
                                                lead.channelTag === "TELEGRAM" ? "text-brand-blue" : "text-brand-green"
                                            )}>
                                                {lead.channelTag === "TELEGRAM" ? "TG" : "WA"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className={cn("badge", statusConfig.className)}>
                                                {statusConfig.label}
                                            </span>
                                            <span className="text-xs text-text-faint">
                                                {formatRelative(lead.createdAt)}
                                            </span>
                                        </div>
                                        {(lead.email || lead.phone) && (
                                            <p className="text-xs text-text-secondary truncate">{lead.email || lead.phone}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        </>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
