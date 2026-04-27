"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { getAuthHeaders } from "@/lib/auth";
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
    AlertTriangle,
    Heart,
    Trophy,
    BarChart3,
    Bell,
    Star,
    Sparkles,
    Video,
    XCircle,
    UtensilsCrossed,
    Eye,
    Link,
    Crown,
} from "lucide-react";
import { cn, formatRelative } from "@/lib/utils";

interface EventLog {
    id: string;
    coachId: string | null;
    clientId: string | null;
    clientName: string | null;
    eventType: string;
    channel: "WHATSAPP" | "TELEGRAM" | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}

const EVENT_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    // Lead lifecycle
    "lead.created": { label: "New Lead", icon: UserPlus, color: "text-brand-orange" },
    "lead.intake_complete": { label: "Lead Intake Complete", icon: CheckCircle2, color: "text-brand-green" },
    "lead.converted": { label: "Lead Converted", icon: ArrowRight, color: "text-brand-green" },

    // Client lifecycle
    "client.created": { label: "Client Added", icon: UserPlus, color: "text-brand-blue" },
    "client.activated": { label: "Client Activated", icon: CheckCircle2, color: "text-brand-green" },
    "client.paused": { label: "Client Paused", icon: AlertTriangle, color: "text-brand-orange" },
    "client.inactive": { label: "Client Inactive", icon: XCircle, color: "text-text-faint" },

    // Payment
    "payment.created": { label: "Payment Created", icon: CreditCard, color: "text-brand-blue" },
    "payment.confirmed": { label: "Payment Confirmed", icon: CreditCard, color: "text-brand-green" },
    "payment.failed": { label: "Payment Failed", icon: XCircle, color: "text-brand-red" },
    "payment.bank_transfer_confirmed": { label: "Bank Transfer Confirmed", icon: CreditCard, color: "text-brand-violet" },
    "payment.bank_transfer_sent": { label: "Bank Details Sent", icon: Send, color: "text-brand-violet" },
    "payment.reminder_sent": { label: "Payment Reminder Sent", icon: Bell, color: "text-brand-orange" },
    "payment.confirmed_sent": { label: "Payment Receipt Sent", icon: CreditCard, color: "text-brand-green" },
    "renewal.reminder_sent": { label: "Renewal Reminder Sent", icon: Bell, color: "text-brand-orange" },

    // Plan & Workout
    "plan.assigned": { label: "Workout Plan Assigned", icon: Dumbbell, color: "text-brand-blue" },
    "template.used": { label: "Template Used", icon: Dumbbell, color: "text-brand-blue" },
    "workout.delivered": { label: "Workout Delivered", icon: Send, color: "text-brand-cyan" },
    "workout.completed": { label: "Workout Completed", icon: CheckCircle2, color: "text-brand-green" },

    // Meal Plan
    "meal_plan.assigned": { label: "Meal Plan Assigned", icon: UtensilsCrossed, color: "text-brand-blue" },
    "meal_plan.template_used": { label: "Meal Template Used", icon: UtensilsCrossed, color: "text-brand-blue" },
    "meal.delivered": { label: "Meal Plan Delivered", icon: Send, color: "text-brand-cyan" },
    "meal.completed": { label: "Meal Plan Completed", icon: CheckCircle2, color: "text-brand-green" },

    // Check-in
    "checkin.sent": { label: "Check-in Sent", icon: MessageSquare, color: "text-brand-blue" },
    "checkin.completed": { label: "Check-in Completed", icon: CheckCircle2, color: "text-brand-green" },

    // Channel & Bot
    "channel.assigned": { label: "Channel Assigned", icon: MessageSquare, color: "text-brand-cyan" },
    "bot.provisioned": { label: "Telegram Bot Created", icon: Bot, color: "text-brand-blue" },

    // Onboarding
    "onboarding.sent": { label: "Onboarding Sent", icon: Send, color: "text-brand-violet" },
    "intake.completed": { label: "Intake Completed", icon: CheckCircle2, color: "text-brand-green" },

    // Engagement & retention
    "engagement.missed_workout_sent": { label: "Missed Workout Nudge", icon: Heart, color: "text-brand-orange" },
    "engagement.atrisk_sent": { label: "At-Risk Alert Sent", icon: AlertTriangle, color: "text-brand-red" },
    "engagement.reengagement_sent": { label: "Re-engagement Sent", icon: Heart, color: "text-brand-violet" },
    "engagement.missed_checkin_sent": { label: "Missed Check-in Nudge", icon: Bell, color: "text-brand-orange" },
    "engagement.milestone_sent": { label: "Milestone Celebrated", icon: Trophy, color: "text-brand-green" },
    "engagement.week_summary_sent": { label: "Weekly Summary Sent", icon: BarChart3, color: "text-brand-blue" },

    // Exercise videos
    "exercise.video_sent": { label: "Exercise Video Sent", icon: Video, color: "text-brand-cyan" },
    "exercise.video_failed": { label: "Video Send Failed", icon: XCircle, color: "text-brand-red" },
    "exercise.command_parsed": { label: "Exercise Requested", icon: Dumbbell, color: "text-brand-blue" },

    // Coach onboarding
    "coach_onboarding.step_completed": { label: "Setup Step Completed", icon: CheckCircle2, color: "text-brand-green" },
    "coach_onboarding.step_skipped": { label: "Setup Step Skipped", icon: ArrowRight, color: "text-text-faint" },
    "coach_onboarding.completed": { label: "Setup Complete", icon: Star, color: "text-brand-green" },
    "trainer.activated": { label: "Coach Activated", icon: Star, color: "text-brand-green" },

    // Profile
    "profile.viewed": { label: "Profile Viewed", icon: Eye, color: "text-text-secondary" },
    "profile.channel_click": { label: "Profile Channel Clicked", icon: Link, color: "text-brand-blue" },
    "profile.redirect": { label: "Profile Redirected", icon: ArrowRight, color: "text-brand-blue" },
    "profile.link_copied": { label: "Profile Link Copied", icon: Link, color: "text-brand-cyan" },

    // Subscription
    "subscription.created": { label: "Subscription Started", icon: Crown, color: "text-brand-green" },
    "subscription.upgraded": { label: "Plan Upgraded", icon: Crown, color: "text-brand-green" },
    "subscription.downgraded": { label: "Plan Downgraded", icon: Crown, color: "text-brand-orange" },
    "subscription.canceled": { label: "Subscription Canceled", icon: XCircle, color: "text-brand-red" },
    "subscription.renewed": { label: "Subscription Renewed", icon: Crown, color: "text-brand-green" },
    "subscription.payment_failed": { label: "Subscription Payment Failed", icon: XCircle, color: "text-brand-red" },
    "subscription.trial_ending": { label: "Trial Ending Soon", icon: Bell, color: "text-brand-orange" },

    // Messages
    "message.delivered": { label: "Message Delivered", icon: CheckCircle2, color: "text-brand-green" },
    "message.read": { label: "Message Read", icon: CheckCircle2, color: "text-brand-cyan" },
    "message.failed": { label: "Message Failed", icon: XCircle, color: "text-brand-red" },
    "message.window_closed": { label: "Message Window Closed", icon: AlertTriangle, color: "text-brand-orange" },

    // AI
    "ai.plan_generated": { label: "AI Plan Generated", icon: Sparkles, color: "text-brand-violet" },
    "ai.meal_plan_generated": { label: "AI Meal Plan Generated", icon: Sparkles, color: "text-brand-violet" },
    "risk.score_computed": { label: "Risk Score Updated", icon: BarChart3, color: "text-brand-blue" },
};

const getEventConfig = (eventType: string) => {
    return EVENT_CONFIG[eventType] || {
        label: eventType.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        icon: Activity,
        color: "text-text-secondary",
    };
};

/** Build a human-readable description from event type, client name, and metadata */
function getEventDescription(event: EventLog): string | null {
    const name = event.clientName;
    const meta = event.metadata || {};

    switch (event.eventType) {
        // Leads
        case "lead.created":
            return name ? `${name} signed up` : "New lead signed up";
        case "lead.intake_complete":
            return name ? `${name} completed intake form` : null;
        case "lead.converted":
            return name ? `${name} converted to client` : null;

        // Clients
        case "client.created":
            return name ? `${name} added as a client` : null;
        case "client.activated":
            return name ? `${name} is now active` : null;
        case "client.paused":
            return name ? `${name} paused` : null;

        // Workouts
        case "workout.delivered": {
            const plan = meta.planTitle as string | undefined;
            if (name && plan) return `Sent "${plan}" to ${name}`;
            if (name) return `Workout sent to ${name}`;
            return plan ? `Sent "${plan}"` : null;
        }
        case "workout.completed":
            return name ? `${name} completed their workout` : null;
        case "plan.assigned": {
            const plan = meta.planTitle as string | undefined;
            if (name && plan) return `"${plan}" assigned to ${name}`;
            return name ? `Plan assigned to ${name}` : null;
        }

        // Meals
        case "meal.delivered": {
            const plan = meta.planTitle as string | undefined;
            if (name && plan) return `Sent "${plan}" to ${name}`;
            if (name) return `Meal plan sent to ${name}`;
            return plan ? `Sent "${plan}"` : null;
        }
        case "meal_plan.assigned": {
            const plan = meta.planTitle as string | undefined;
            if (name && plan) return `"${plan}" assigned to ${name}`;
            return name ? `Meal plan assigned to ${name}` : null;
        }

        // Check-ins
        case "checkin.sent": {
            const type = meta.type as string | undefined;
            const label = type === "renewal_reminder" ? "renewal check-in" : "check-in";
            return name ? `${label.charAt(0).toUpperCase() + label.slice(1)} sent to ${name}` : null;
        }
        case "checkin.completed":
            return name ? `${name} submitted their check-in` : null;

        // Engagement
        case "engagement.missed_workout_sent":
            return name ? `Nudged ${name} about missed workout` : null;
        case "engagement.missed_checkin_sent":
            return name ? `Reminded ${name} to check in` : null;
        case "engagement.atrisk_sent":
            return name ? `At-risk alert sent for ${name}` : null;
        case "engagement.reengagement_sent":
            return name ? `Re-engagement message sent to ${name}` : null;
        case "engagement.milestone_sent": {
            const type = meta.milestoneType as string | undefined;
            if (name && type) return `Celebrated ${name}'s ${type.replace(/_/g, " ")}`;
            return name ? `Milestone celebrated for ${name}` : null;
        }
        case "engagement.week_summary_sent":
            return name ? `Weekly summary sent to ${name}` : null;

        // Payments
        case "payment.confirmed": {
            const amount = meta.amount as number | undefined;
            const currency = meta.currency as string | undefined;
            if (name && amount && currency) {
                const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0 }).format(amount / 100);
                return `${name} paid ${formatted}`;
            }
            return name ? `Payment received from ${name}` : null;
        }
        case "payment.bank_transfer_confirmed":
            return name ? `Bank transfer confirmed for ${name}` : null;
        case "payment.bank_transfer_sent":
            return name ? `Bank details sent to ${name}` : null;
        case "payment.reminder_sent":
            return name ? `Payment reminder sent to ${name}` : null;

        // Onboarding
        case "onboarding.sent":
            return name ? `Onboarding message sent to ${name}` : null;
        case "intake.completed":
            return name ? `${name} completed intake` : null;

        // Exercise
        case "exercise.video_sent":
            return name ? `Exercise video sent to ${name}` : null;

        // Templates
        case "template.used": {
            const title = meta.templateTitle as string | undefined;
            return title ? `Used template "${title}"` : null;
        }
        case "meal_plan.template_used": {
            const title = meta.templateTitle as string | undefined;
            return title ? `Used meal template "${title}"` : null;
        }

        // Subscription
        case "subscription.upgraded": {
            const from = meta.from as string | undefined;
            const to = meta.to as string | undefined;
            if (from && to) return `Upgraded from ${from.toLowerCase()} to ${to.toLowerCase()}`;
            return null;
        }
        case "subscription.downgraded": {
            const from = meta.from as string | undefined;
            const to = meta.to as string | undefined;
            if (from && to) return `Downgraded from ${from.toLowerCase()} to ${to.toLowerCase()}`;
            return null;
        }

        // AI
        case "ai.plan_generated":
            return name ? `AI workout plan generated for ${name}` : "AI workout plan generated";
        case "ai.meal_plan_generated":
            return name ? `AI meal plan generated for ${name}` : "AI meal plan generated";
        case "risk.score_computed": {
            const level = meta.level as string | undefined;
            if (name && level) return `${name} scored ${level.toLowerCase()} risk`;
            return name ? `Risk score updated for ${name}` : null;
        }

        default:
            return name || null;
    }
}

export default function ActivityPage() {
    const [events, setEvents] = useState<EventLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/analytics/events?limit=100`,
                { headers: await getAuthHeaders() }
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
                    <div className="empty-state-icon">
                        <Activity className="w-6 h-6" />
                    </div>
                    <h3>No activity yet</h3>
                    <p className="text-text-secondary text-sm text-pretty">
                        Events will appear here as clients interact with your coaching system.
                    </p>
                </div>
            ) : (
                <div className="space-y-1">
                    {events.map((event, index) => {
                        const config = getEventConfig(event.eventType);
                        const Icon = config.icon;
                        const description = getEventDescription(event);

                        return (
                            <div
                                key={event.id}
                                className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 rounded-xl hover:bg-bg-hover transition-colors group animate-fade-in"
                                style={{ animationDelay: `${Math.min(index, 10) * 30}ms`, animationFillMode: "both" }}
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
                                        {description && (
                                            <span className="truncate">
                                                {description}
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
