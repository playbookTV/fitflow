"use client";

import { getAuthHeaders } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function adminFetch<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`${API_URL}/admin${path}`);
    if (params) {
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== "") {
                url.searchParams.set(key, String(value));
            }
        }
    }

    const res = await fetch(url.toString(), { headers: await getAuthHeaders() });
    if (!res.ok) {
        throw new Error(`Admin API error: ${res.status}`);
    }
    return res.json();
}

// ── Types ──

export interface OverviewData {
    totalCoaches: number;
    totalClients: number;
    newCoachesThisMonth: number;
    newClientsThisMonth: number;
    activeSubscriptions: number;
    tierBreakdown: Record<string, number>;
    trialing: number;
    pastDue: number;
    mrr: number;
    totalRevenue: number;
    recentCoaches: { id: string; name: string | null; email: string; createdAt: string }[];
    recentEvents: EventLogEntry[];
}

export interface CoachListItem {
    id: string;
    name: string | null;
    email: string;
    slug: string | null;
    businessName: string | null;
    billingCurrency: string;
    onboardingCompleted: boolean;
    createdAt: string;
    subscription: {
        tier: string;
        status: string;
        billingInterval: string;
        trialEnd: string | null;
    } | null;
    clientCount: number;
    revenue: number;
}

export interface CoachListResponse {
    coaches: CoachListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface CoachDetail {
    id: string;
    name: string | null;
    email: string;
    slug: string | null;
    phone: string | null;
    businessName: string | null;
    timezone: string;
    billingCurrency: string;
    stripeAccountId: string | null;
    onboardingCompleted: boolean;
    onboardingStep: number;
    createdAt: string;
    subscription: {
        id: string;
        tier: string;
        status: string;
        billingInterval: string;
        currentPeriodStart: string;
        currentPeriodEnd: string;
        cancelAtPeriodEnd: boolean;
        trialEnd: string | null;
    } | null;
    _count: {
        clients: number;
        plans: number;
        mealPlans: number;
        offers: number;
        leads: number;
    };
    revenue: number;
    recentEvents: EventLogEntry[];
}

export interface ClientListItem {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: string;
    preferredChannel: string;
    monthlyRate: number | null;
    createdAt: string;
}

export interface ClientListResponse {
    clients: ClientListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface RevenueData {
    mrr: number;
    mrrByTier: Record<string, number>;
    monthlyRevenue: { month: string; amount: number }[];
    paymentVolume: {
        stripe: { total: number; count: number };
        bankTransfer: { total: number; count: number };
    };
    churn: { last30Days: number; last60Days: number; last90Days: number };
    recentChanges: (EventLogEntry & { coachName: string | null })[];
}

export interface EventLogEntry {
    id: string;
    coachId: string | null;
    clientId: string | null;
    eventType: string;
    channel: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}

export interface EventLogResponse {
    events: (EventLogEntry & { coachName: string | null; clientName: string | null })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// ── Fetchers ──

export const fetchOverview = () => adminFetch<OverviewData>("/overview");

export const fetchCoaches = (params?: {
    page?: number;
    limit?: number;
    search?: string;
    tier?: string;
    status?: string;
    sort?: string;
    order?: string;
}) => adminFetch<CoachListResponse>("/coaches", params as Record<string, string | number | undefined>);

export const fetchCoach = (id: string) => adminFetch<CoachDetail>(`/coaches/${id}`);

export const fetchCoachClients = (id: string, params?: { page?: number; limit?: number }) =>
    adminFetch<ClientListResponse>(`/coaches/${id}/clients`, params as Record<string, string | number | undefined>);

export const fetchRevenue = () => adminFetch<RevenueData>("/revenue");

export const fetchEvents = (params?: {
    page?: number;
    limit?: number;
    eventType?: string;
    coachId?: string;
    after?: string;
    before?: string;
}) => adminFetch<EventLogResponse>("/events", params as Record<string, string | number | undefined>);
