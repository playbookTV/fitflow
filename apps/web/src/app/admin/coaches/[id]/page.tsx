"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Users,
    Dumbbell,
    UtensilsCrossed,
    Link2,

    Activity,
    Mail,
    Phone,
    Globe,
    CreditCard,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatCard } from "@/components/admin/StatCard";
import {
    fetchCoach,
    fetchCoachClients,
    type CoachDetail,
    type ClientListResponse,
} from "@/lib/admin-api";
import { formatCurrency } from "@/lib/tokens";
import { formatRelative, cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: "text-brand-green bg-brand-green/10",
    TRIALING: "text-brand-cyan bg-brand-cyan/10",
    PAST_DUE: "text-brand-orange bg-brand-orange/10",
    CANCELED: "text-brand-red bg-brand-red/10",
    PENDING_PAYMENT: "text-brand-orange bg-brand-orange/10",
    INTAKE_SENT: "text-brand-blue bg-brand-blue/10",
    INTAKE_COMPLETE: "text-brand-violet bg-brand-violet/10",
    PLAN_ASSIGNED: "text-brand-cyan bg-brand-cyan/10",
    PAUSED: "text-text-faint bg-white/5",
    INACTIVE: "text-text-faint bg-white/5",
};

export default function AdminCoachDetailPage() {
    const params = useParams();
    const id = params.id as string;

    const [coach, setCoach] = useState<CoachDetail | null>(null);
    const [clients, setClients] = useState<ClientListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([fetchCoach(id), fetchCoachClients(id)])
            .then(([coachData, clientsData]) => {
                setCoach(coachData);
                setClients(clientsData);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <AdminLayout title="Coach Detail">
                <div className="space-y-6">
                    <div className="skeleton h-32 rounded-2xl" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="skeleton h-24 rounded-xl" />
                        ))}
                    </div>
                </div>
            </AdminLayout>
        );
    }

    if (error || !coach) {
        return (
            <AdminLayout title="Coach Detail">
                <div className="p-4 rounded-xl bg-brand-red/10 border border-brand-red/20 text-brand-red text-sm">
                    {error || "Coach not found"}
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout
            title={coach.name || coach.email}
            subtitle={coach.businessName || coach.slug || undefined}
        >
            {/* Back link */}
            <Link
                href="/admin/coaches"
                className="inline-flex items-center gap-1.5 text-sm text-text-faint hover:text-white mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to coaches
            </Link>

            {/* Coach Info Card */}
            <div className="card p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-orange to-brand-red flex items-center justify-center text-white font-bold text-lg shrink-0">
                        {(coach.name || coach.email)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold text-white">{coach.name || "Unnamed"}</h2>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-text-faint">
                            <span className="flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5" /> {coach.email}
                            </span>
                            {coach.phone && (
                                <span className="flex items-center gap-1">
                                    <Phone className="w-3.5 h-3.5" /> {coach.phone}
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <Globe className="w-3.5 h-3.5" /> {coach.timezone}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {coach.subscription ? (
                                <>
                                    <span className="text-xs font-medium px-2 py-1 rounded-lg text-brand-violet bg-brand-violet/10">
                                        {coach.subscription.tier}
                                    </span>
                                    <span className={cn(
                                        "text-xs font-medium px-2 py-1 rounded-lg",
                                        STATUS_COLORS[coach.subscription.status] || "text-text-faint bg-white/5"
                                    )}>
                                        {coach.subscription.status}
                                    </span>
                                    <span className="text-xs text-text-faint px-2 py-1">
                                        {coach.subscription.billingInterval}
                                    </span>
                                </>
                            ) : (
                                <span className="text-xs text-text-faint px-2 py-1 rounded-lg bg-white/5">
                                    No subscription
                                </span>
                            )}
                            {coach.stripeAccountId && (
                                <span className="text-xs font-medium px-2 py-1 rounded-lg text-brand-green bg-brand-green/10 flex items-center gap-1">
                                    <CreditCard className="w-3 h-3" /> Stripe connected
                                </span>
                            )}
                            {!coach.onboardingCompleted && (
                                <span className="text-xs font-medium px-2 py-1 rounded-lg text-brand-orange bg-brand-orange/10">
                                    Onboarding step {coach.onboardingStep}/6
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-xs text-text-faint">Joined</p>
                        <p className="text-sm text-white">{new Date(coach.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                <StatCard label="Clients" value={coach._count.clients} icon={Users} color="blue" />
                <StatCard label="Plans" value={coach._count.plans} icon={Dumbbell} color="violet" />
                <StatCard label="Meal Plans" value={coach._count.mealPlans} icon={UtensilsCrossed} color="green" />
                <StatCard label="Offers" value={coach._count.offers} icon={Link2} color="cyan" />
                <StatCard label="Revenue" value={formatCurrency(coach.revenue, coach.billingCurrency.toUpperCase())} icon={CreditCard} color="orange" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Clients */}
                <div className="card p-6">
                    <h2 className="text-sm font-semibold text-white mb-4">
                        Clients ({clients?.total ?? 0})
                    </h2>
                    {clients?.clients.length === 0 ? (
                        <p className="text-sm text-text-faint py-4 text-center">No clients yet</p>
                    ) : (
                        <div className="space-y-1">
                            {clients?.clients.map((client) => (
                                <div
                                    key={client.id}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-white">{client.name}</p>
                                        <p className="text-xs text-text-faint">
                                            {client.email || client.phone || "-"}
                                        </p>
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-medium px-2 py-0.5 rounded-lg",
                                        STATUS_COLORS[client.status] || "text-text-faint bg-white/5"
                                    )}>
                                        {client.status.replace(/_/g, " ")}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Events */}
                <div className="card p-6">
                    <h2 className="text-sm font-semibold text-white mb-4">Recent Events</h2>
                    {coach.recentEvents.length === 0 ? (
                        <p className="text-sm text-text-faint py-4 text-center">No events yet</p>
                    ) : (
                        <div className="space-y-1">
                            {coach.recentEvents.map((event) => (
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
            </div>
        </AdminLayout>
    );
}
