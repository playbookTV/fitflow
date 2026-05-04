"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui";
import posthog from "posthog-js";

export default function ResetPasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSession, setHasSession] = useState<boolean | null>(null);
    const supabase = createClient();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setHasSession(!!session);
        });
    }, [supabase]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords don't match.");
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            setError(error.message);
            posthog.captureException(error);
            setLoading(false);
        } else {
            posthog.capture("coach_password_reset_completed");
            await supabase.auth.signOut();
            window.location.href = "/login?reset=true";
        }
    };

    if (hasSession === false) {
        return (
            <div className="relative flex min-h-dvh items-center justify-center p-6 sm:p-12 overflow-hidden">
                <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                    <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-brand-red/[0.04] blur-[120px]" />
                </div>
                <div className="relative w-full max-w-[400px] animate-fade-in text-center">
                    <Logo size="sm" showText className="mb-12" />
                    <h1 className="heading-display mb-3 text-balance">
                        Link expired
                    </h1>
                    <p className="mb-10 text-sm text-text-secondary text-pretty">
                        This password reset link is invalid or has expired. Request a new one to continue.
                    </p>
                    <Link href="/forgot-password" className="btn-primary w-full inline-flex justify-center">
                        REQUEST NEW LINK
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-dvh items-center justify-center p-6 sm:p-12 overflow-hidden">
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-brand-green/[0.04] blur-[120px]" />
                <div className="absolute -bottom-40 -right-40 h-[400px] w-[400px] rounded-full bg-brand-violet/[0.05] blur-[120px]" />
            </div>

            <div className="relative w-full max-w-[400px] animate-fade-in">
                <Logo size="sm" showText className="mb-12" />

                <h1 className="heading-display mb-3 text-balance">
                    Set a new password
                </h1>
                <p className="mb-10 text-sm text-text-secondary text-pretty">
                    Choose a strong password you haven&apos;t used before.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="form-field">
                        <label htmlFor="password" className="label-mono">New password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            required
                            minLength={8}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input w-full"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="form-field">
                        <label htmlFor="confirmPassword" className="label-mono">Confirm password</label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            required
                            minLength={8}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
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
                        disabled={loading || hasSession === null}
                        className="btn-primary w-full"
                    >
                        {loading ? "UPDATING..." : "UPDATE PASSWORD"}
                    </button>
                </form>
            </div>
        </div>
    );
}
