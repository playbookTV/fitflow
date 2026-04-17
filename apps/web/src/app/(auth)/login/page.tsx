"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getAuthHeaders } from "@/lib/auth";
import { Logo } from "@/components/ui";
import { CheckCircle2 } from "lucide-react";

function LoginContent() {
    const searchParams = useSearchParams();
    const confirmed = searchParams.get("confirmed") === "true";
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            try {
                const headers = await getAuthHeaders();
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/coaches/me`,
                    { headers }
                );
                if (res.ok) {
                    const coach = await res.json();
                    window.location.href = coach.onboardingCompleted
                        ? "/dashboard"
                        : "/setup";
                } else {
                    window.location.href = "/setup";
                }
            } catch {
                window.location.href = "/dashboard";
            }
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-6 sm:p-12">
            <div className="w-full max-w-[400px] animate-fade-in">
                {/* Logo */}
                <Logo size="sm" showText className="mb-12" />

                <h1 className="mb-2 font-display text-3xl font-semibold text-text-primary">
                    Welcome back
                </h1>
                <p className="mb-10 text-sm text-text-secondary">
                    Enter your details to access your coaching dashboard.
                </p>

                {confirmed && (
                    <div className="mb-6 flex items-center gap-2 rounded-lg border border-brand-green/20 bg-brand-green/10 px-4 py-3 text-sm text-brand-green">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        Email confirmed! You can now log in.
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="form-field">
                        <label className="label-mono">Email address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input w-full"
                            placeholder="e.g. coach@fitflow.co"
                        />
                    </div>

                    <div className="form-field">
                        <label className="label-mono">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input w-full"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="form-error-box">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full"
                    >
                        {loading ? "AUTHENTICATING..." : "LOG IN"}
                    </button>
                </form>

                <div className="mt-10 text-center text-xs text-text-faint">
                    Don&apos;t have an account?{" "}
                    <Link href="/register" className="link-underline">
                        Create one for free
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginContent />
        </Suspense>
    );
}
