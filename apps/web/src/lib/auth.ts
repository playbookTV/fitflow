"use client";

import { createClient } from "@/lib/supabase/client";

export async function getAuthHeaders(): Promise<HeadersInit> {
    const supabase = createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
}
