"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ADMIN_IDS = new Set(
    (process.env.NEXT_PUBLIC_PLATFORM_ADMIN_IDS || "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
);

export function AdminGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const check = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user || !ADMIN_IDS.has(user.id)) {
                router.replace("/dashboard");
                return;
            }

            setAuthorized(true);
            setLoading(false);
        };

        check();
    }, [router]);

    if (loading || !authorized) {
        return (
            <div className="min-h-dvh bg-mesh-gradient flex items-center justify-center">
                <div className="text-text-faint text-sm">Loading...</div>
            </div>
        );
    }

    return <>{children}</>;
}
