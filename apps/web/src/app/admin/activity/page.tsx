"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, Activity } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { fetchEvents, type EventLogResponse } from "@/lib/admin-api";
import { formatRelative, cn } from "@/lib/utils";

const EVENT_TYPE_GROUPS: Record<string, string[]> = {
    "Lead": ["lead.created", "lead.intake_complete", "lead.converted"],
    "Client": ["client.created", "client.activated", "client.paused", "client.inactive"],
    "Payment": ["payment.created", "payment.confirmed", "payment.failed", "payment.bank_transfer_confirmed"],
    "Plan": ["plan.assigned", "workout.delivered", "workout.completed"],
    "Meal": ["meal_plan.assigned", "meal.delivered", "meal.completed"],
    "Check-in": ["checkin.sent", "checkin.completed"],
    "Engagement": ["engagement.missed_workout_sent", "engagement.atrisk_sent", "engagement.week_summary_sent", "engagement.milestone_sent"],
    "Subscription": ["subscription.created", "subscription.upgraded", "subscription.downgraded", "subscription.canceled"],
};

const EVENT_COLORS: Record<string, string> = {
    "lead": "text-brand-cyan",
    "client": "text-brand-blue",
    "payment": "text-brand-green",
    "plan": "text-brand-violet",
    "workout": "text-brand-violet",
    "meal": "text-brand-orange",
    "checkin": "text-brand-blue",
    "engagement": "text-brand-orange",
    "subscription": "text-brand-green",
    "risk": "text-brand-red",
    "onboarding": "text-brand-cyan",
    "intake": "text-brand-cyan",
    "renewal": "text-brand-orange",
};

function getEventColor(eventType: string): string {
    const prefix = eventType.split(".")[0];
    return EVENT_COLORS[prefix] || "text-text-faint";
}

export default function AdminActivityPage() {
    const [data, setData] = useState<EventLogResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [eventType, setEventType] = useState("");
    const [coachFilter, setCoachFilter] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetchEvents({
                page,
                limit: 50,
                eventType: eventType || undefined,
                coachId: coachFilter || undefined,
            });
            setData(result);
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    }, [page, eventType, coachFilter]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <AdminLayout title="Activity Log" subtitle={data ? `${data.total} events` : undefined}>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <select
                    value={eventType}
                    onChange={(e) => { setEventType(e.target.value); setPage(1); }}
                    className="input w-full sm:w-56"
                >
                    <option value="">All Event Types</option>
                    {Object.entries(EVENT_TYPE_GROUPS).map(([group, types]) => (
                        <optgroup key={group} label={group}>
                            {types.map((t) => (
                                <option key={t} value={t}>
                                    {t.replace(/[._]/g, " ")}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
                <input
                    type="text"
                    placeholder="Filter by coach ID..."
                    value={coachFilter}
                    onChange={(e) => { setCoachFilter(e.target.value); setPage(1); }}
                    className="input w-full sm:w-64"
                />
            </div>

            {/* Event Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left text-xs font-medium text-text-faint uppercase tracking-wider px-4 py-3">Time</th>
                                <th className="text-left text-xs font-medium text-text-faint uppercase tracking-wider px-4 py-3">Event</th>
                                <th className="text-left text-xs font-medium text-text-faint uppercase tracking-wider px-4 py-3">Coach</th>
                                <th className="text-left text-xs font-medium text-text-faint uppercase tracking-wider px-4 py-3">Client</th>
                                <th className="text-left text-xs font-medium text-text-faint uppercase tracking-wider px-4 py-3">Channel</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i} className="border-b border-border/50">
                                        <td className="px-4 py-3"><div className="skeleton h-5 w-24 rounded" /></td>
                                        <td className="px-4 py-3"><div className="skeleton h-5 w-40 rounded" /></td>
                                        <td className="px-4 py-3"><div className="skeleton h-5 w-28 rounded" /></td>
                                        <td className="px-4 py-3"><div className="skeleton h-5 w-28 rounded" /></td>
                                        <td className="px-4 py-3"><div className="skeleton h-5 w-16 rounded" /></td>
                                    </tr>
                                ))
                            ) : data?.events.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-text-faint">
                                        No events found
                                    </td>
                                </tr>
                            ) : (
                                data?.events.map((event) => (
                                    <tr
                                        key={event.id}
                                        className="border-b border-border/50 hover:bg-white/[0.02] transition-colors"
                                    >
                                        <td className="px-4 py-3">
                                            <span className="text-xs text-text-faint whitespace-nowrap">
                                                {formatRelative(event.createdAt)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Activity className={cn("w-3.5 h-3.5 shrink-0", getEventColor(event.eventType))} />
                                                <span className="text-sm text-white">
                                                    {event.eventType.replace(/[._]/g, " ")}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {event.coachName ? (
                                                <span className="text-sm text-text-secondary">{event.coachName}</span>
                                            ) : (
                                                <span className="text-xs text-text-faint">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {event.clientName ? (
                                                <span className="text-sm text-text-secondary">{event.clientName}</span>
                                            ) : (
                                                <span className="text-xs text-text-faint">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {event.channel ? (
                                                <span className="text-xs font-medium px-2 py-0.5 rounded-lg bg-white/5 text-text-secondary">
                                                    {event.channel}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-text-faint">-</span>
                                            )}
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
                            Page {data.page} of {data.totalPages} ({data.total} events)
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
