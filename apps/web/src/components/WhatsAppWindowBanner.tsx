"use client";

import { useEffect, useState, useCallback } from "react";
import { Clock, AlertTriangle, MessageCircle } from "lucide-react";
import { getAuthHeaders } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface WindowStatus {
    channel: "WHATSAPP" | "TELEGRAM";
    windowOpen: boolean;
    windowExpiresAt: string | null;
    canSendFreeText: boolean;
    canSendMarketingTemplate: boolean;
}

interface WhatsAppWindowBannerProps {
    clientId: string;
    channel: "WHATSAPP" | "TELEGRAM";
    compact?: boolean;
    className?: string;
    onWindowStatusChange?: (canSendFreeText: boolean) => void;
}

function formatTimeRemaining(expiresAt: string): string {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
}

export function useWhatsAppWindow(clientId: string | null, channel: "WHATSAPP" | "TELEGRAM") {
    const [status, setStatus] = useState<WindowStatus | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStatus = useCallback(async () => {
        if (!clientId || channel !== "WHATSAPP") {
            setStatus(null);
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/messages/${clientId}/window-status`,
                { headers: await getAuthHeaders() }
            );
            if (res.ok) {
                const data = await res.json();
                setStatus(data);
            }
        } catch {
            // Silent — don't block messaging UX on status fetch failure
        } finally {
            setLoading(false);
        }
    }, [clientId, channel]);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 60_000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    // Update countdown display every minute without re-fetching
    const [, setTick] = useState(0);
    useEffect(() => {
        if (!status?.windowExpiresAt) return;
        const interval = setInterval(() => setTick((t) => t + 1), 60_000);
        return () => clearInterval(interval);
    }, [status?.windowExpiresAt]);

    return { status, loading, refetch: fetchStatus };
}

export function WhatsAppWindowBanner({
    clientId,
    channel,
    compact = false,
    className,
    onWindowStatusChange,
}: WhatsAppWindowBannerProps) {
    const { status, loading } = useWhatsAppWindow(clientId, channel);

    useEffect(() => {
        if (status) {
            onWindowStatusChange?.(status.canSendFreeText);
        }
    }, [status, onWindowStatusChange]);

    if (channel !== "WHATSAPP" || loading || !status) return null;

    // Compact mode: just a dot indicator for the chat header
    if (compact) {
        return (
            <span
                className={cn(
                    "inline-block w-2 h-2 rounded-full",
                    status.windowOpen ? "bg-brand-green" : "bg-brand-orange",
                    className
                )}
                title={
                    status.windowOpen
                        ? `WhatsApp window open — ${status.windowExpiresAt ? formatTimeRemaining(status.windowExpiresAt) : ""}`
                        : "WhatsApp window closed — only templates can be sent"
                }
            />
        );
    }

    if (status.windowOpen) {
        return (
            <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-green/20 bg-brand-green/5 text-xs", className)}>
                <Clock className="w-3.5 h-3.5 text-brand-green shrink-0" />
                <span className="text-brand-green font-medium">
                    WhatsApp window open
                </span>
                {status.windowExpiresAt && (
                    <span className="text-text-faint">
                        — {formatTimeRemaining(status.windowExpiresAt)}
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className={cn("rounded-xl border border-brand-orange/20 bg-brand-orange/5 text-xs", className)}>
            <div className="flex items-start gap-2 px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-brand-orange shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <p className="text-brand-orange font-medium">
                        WhatsApp messaging window closed
                    </p>
                    <p className="text-text-faint mt-0.5">
                        Only automated template messages can be sent. The window reopens when the client messages you.
                    </p>
                </div>
            </div>
            <details className="px-3 pb-2">
                <summary className="text-text-faint cursor-pointer hover:text-text-secondary transition-colors flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    Learn more about WhatsApp messaging rules
                </summary>
                <div className="mt-2 space-y-2 text-text-faint pl-4">
                    <p>
                        <strong className="text-text-secondary">24-hour window:</strong> WhatsApp only allows free-form messages within 24 hours of the client&apos;s last message to you. This is a Meta policy that applies to all businesses.
                    </p>
                    <p>
                        <strong className="text-text-secondary">Templates:</strong> Outside this window, FitFlow can still send pre-approved template messages (workout deliveries, check-in reminders, re-engagement nudges) automatically.
                    </p>
                    <p>
                        <strong className="text-text-secondary">Tip:</strong> Encourage clients to reply to messages — each reply resets the 24-hour window.
                    </p>
                </div>
            </details>
        </div>
    );
}
