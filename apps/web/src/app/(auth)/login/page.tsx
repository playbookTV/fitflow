"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getAuthHeaders } from "@/lib/auth";
import { Logo } from "@/components/ui";
import { CheckCircle2 } from "lucide-react";
import posthog from "posthog-js";

function LoginContent() {
    const searchParams = useSearchParams();
    const confirmed = searchParams.get("confirmed") === "true";
    const reset = searchParams.get("reset") === "true";
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
            posthog.captureException(error);
            setLoading(false);
        } else {
            posthog.identify(email, { email });
            posthog.capture("coach_logged_in", { email });
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
        <div className="relative flex min-h-dvh items-center justify-center p-6 sm:p-12 overflow-hidden">
            {/* Ambient background orbs */}
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-brand-green/[0.04] blur-[120px]" />
                <div className="absolute -bottom-40 -right-40 h-[400px] w-[400px] rounded-full bg-brand-violet/[0.05] blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-brand-blue/[0.02] blur-[120px]" />
            </div>

            <div className="relative w-full max-w-[400px] animate-fade-in">
                {/* Logo */}
                <Logo size="sm" showText className="mb-12" />

                <h1 className="heading-display mb-3 text-balance">
                    Welcome back
                </h1>
                <p className="mb-10 text-sm text-text-secondary text-pretty">
                    Enter your details to access your coaching dashboard.
                </p>

                {confirmed && (
                    <div className="mb-6 flex items-center gap-2 rounded-lg border border-brand-green/20 bg-brand-green/10 px-4 py-3 text-sm text-brand-green">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        Email confirmed! You can now log in.
                    </div>
                )}

                {reset && (
                    <div className="mb-6 flex items-center gap-2 rounded-lg border border-brand-green/20 bg-brand-green/10 px-4 py-3 text-sm text-brand-green">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        Password updated. Log in with your new password.
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="form-field">
                        <label htmlFor="email" className="label-mono">Email address</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input w-full"
                            placeholder="e.g. coach@fitflow.co"
                        />
                    </div>

                    <div className="form-field">
                        <div className="flex items-center justify-between">
                            <label htmlFor="password" className="label-mono">Password</label>
                            <Link href="/forgot-password" className="text-[11px] text-text-faint hover:text-brand-green transition-colors">
                                Forgot password?
                            </Link>
                        </div>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
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
