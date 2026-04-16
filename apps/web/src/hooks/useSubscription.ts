"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/auth";

interface TierLimits {
    maxClients: number;
    maxChannels: number;
    maxBots: number;
    analytics: boolean;
    paymentCollection: boolean;
    checkinSequences: boolean;
    whiteLabel: boolean;
}

interface Usage {
    clients: number;
    plans: number;
    mealPlans: number;
    offers: number;
}

interface SubscriptionStatus {
    subscribed: boolean;
    tier?: string;
    status?: string;
    billingInterval?: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd?: boolean;
    isTrialing?: boolean;
    trialEnd?: string;
    trialDaysLeft?: number;
    limits?: TierLimits;
    usage: Usage;
}

export function useSubscription() {
    const [data, setData] = useState<SubscriptionStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/subscriptions/status`,
                { headers: await getAuthHeaders() }
            );
            if (!res.ok) throw new Error("Failed to fetch subscription status");
            const json = await res.json();
            setData(json);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return {
        ...data,
        isLoading,
        error,
        refetch,
    };
}
