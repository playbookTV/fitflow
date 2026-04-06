"use client";

import { createClient } from "@/lib/supabase/client";

const TOKEN_STORAGE_KEY = "token";

export async function syncAuthToken(): Promise<string | null> {
    const supabase = createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token ?? null;

    if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
    }

    return token;
}

export function getStoredAuthToken(): string | null {
    if (typeof window === "undefined") {
        return null;
    }

    return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export async function getAuthHeaders(): Promise<HeadersInit> {
    const token = (await syncAuthToken()) ?? getStoredAuthToken();

    return token ? { Authorization: `Bearer ${token}` } : {};
}
