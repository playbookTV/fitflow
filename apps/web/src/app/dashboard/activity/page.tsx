"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
    Activity,
    UserPlus,
    CreditCard,
    Dumbbell,
    CheckCircle2,
    Send,
    MessageSquare,
    Bot,
    ArrowRight,
    RefreshCcw,
} from "lucide-react";
import { cn, formatRelative } from "@/lib/utils";

interface EventLog {
    id: string;
    coachId: string | null;
    clientId: string | null;
    eventType: string;
    channel: "WHATSAPP" | "TELEGRAM" | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}

const EVENT_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    "lead.created": { label: "New Lead", icon: UserPlus, color: "text-brand-orange" },
    "lead.converted": { label: "Lead Converted", icon: ArrowRight, color: "text-brand-green" },
    "client.created": { label: "Client Created", icon: UserPlus, color: "text-brand-blue" },
    "client.activated": { label: "Client Activated", icon: CheckCircle2, color: "text-brand-green" },
    "payment.confirmed": { label: "Payment Confirmed", icon: CreditCard, color: "text-brand-green" },
    "payment.bank_transfer_confirmed": { label: "Bank Transfer Confirmed", icon: CreditCard, color: "text-brand-violet" },
    "plan.assigned": { label: "Plan Assigned", icon: Dumbbell, color: "text-brand-blue" },
    "workout.delivered": { label: "Workout Delivered", icon: Send, color: "text-brand-cyan" },
    "workout.completed": { label: "Workout Completed", icon: CheckCircle2, color: "text-brand-green" },
    "checkin.sent": { label: "Check-in Sent", icon: MessageSquare, color: "text-brand-blue" },
    "checkin.completed": { label: "Check-in Completed", icon: CheckCircle2, color: "text-brand-green" },
    "onboarding.sent": { label: "Onboarding Sent", icon: Send, color: "text-brand-violet" },
    "intake.completed": { label: "Intake Completed", icon: CheckCircle2, color: "text-brand-green" },
    "bot.provisioned": { label: "Telegram Bot Provisioned", icon: Bot, color: "text-brand-blue" },
    "channel.assigned": { label: "Channel Assigned", icon: MessageSquare, color: "text-brand-cyan" },
};

const getEventConfig = (eventType: string) => {
    return EVENT_CONFIG[eventType] || {
        label: eventType,
        icon: Activity,
        color: "text-text-secondary",
    };
};

export default function ActivityPage() {
    const [events, setEvents] = useState<EventLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/analytics/events?limit=100`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) setEvents(await res.json());
        } catch (error) {
            console.error("Failed to fetch events:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchEvents(); }, []);

    return (
        <DashboardLayout
            title="Activity Log"
            subtitle="Recent events and state transitions"
            actions={
                <button onClick={fetchEvents} disabled={loading} className="btn-icon">
                    <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
                </button>
            }
        >
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="skeleton h-16 rounded-xl" />
                    ))}
                </div>
            ) : events.length === 0 ? (
                <div className="empty-state">
                    <Activity className="w-12 h-12 text-text-faint mx-auto mb-4" />
                    <p className="text-text-secondary mb-2">No activity yet</p>
                    <p className="text-text-faint text-sm">
                        Events will appear here as clients interact with your coaching system.
                    </p>
                </div>
            ) : (
                <div className="space-y-1">
                    {events.map((event) => {
                        const config = getEventConfig(event.eventType);
                        const Icon = config.icon;

                        return (
                            <div
                                key={event.id}
                                className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-bg-hover transition-colors group"
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-bg-card border border-border",
                                )}>
                                    <Icon className={cn("w-4 h-4", config.color)} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white font-medium">
                                        {config.label}
                                    </p>
                                    <div className="flex items-center gap-2 text-[11px] text-text-faint">
                                        {event.channel && (
                                            <span className={cn(
                                                "font-bold",
                                                event.channel === "TELEGRAM" ? "text-brand-blue" : "text-brand-green"
                                            )}>
                                                {event.channel === "TELEGRAM" ? "TG" : "WA"}
                                            </span>
                                        )}
                                        {event.clientId && (
                                            <span className="font-mono truncate max-w-[120px]">
                                                {event.clientId.slice(0, 8)}...
                                            </span>
                                        )}
                                        {event.metadata && Object.keys(event.metadata).length > 0 && (
                                            <span className="hidden sm:inline text-text-muted truncate max-w-[200px]">
                                                {Object.entries(event.metadata)
                                                    .filter(([k]) => k !== "leadId" && k !== "offerId")
                                                    .map(([k, v]) => `${k}: ${v}`)
                                                    .join(", ")}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <span className="text-[10px] text-text-faint font-mono shrink-0">
                                    {formatRelative(event.createdAt)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </DashboardLayout>
    );
}
