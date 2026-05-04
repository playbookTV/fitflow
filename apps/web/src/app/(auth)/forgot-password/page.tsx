"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui";
import { Mail, ArrowLeft } from "lucide-react";
import posthog from "posthog-js";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [emailSent, setEmailSent] = useState(false);
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-callback`,
        });

        if (error) {
            setError(error.message);
            posthog.captureException(error);
            setLoading(false);
        } else {
            posthog.capture("coach_password_reset_requested", { email });
            setEmailSent(true);
            setLoading(false);
        }
    };

    if (emailSent) {
        return (
            <div className="relative flex min-h-dvh items-center justify-center p-6 sm:p-12 overflow-hidden">
                <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                    <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-brand-green/[0.04] blur-[120px]" />
                    <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-brand-cyan/[0.05] blur-[120px]" />
                </div>

                <div className="relative w-full max-w-[400px] animate-fade-in text-center">
                    <Logo size="sm" showText className="mb-12" />

                    <div className="mb-6 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-green/10 border border-brand-green/20">
                        <Mail className="h-8 w-8 text-brand-green" />
                    </div>

                    <h1 className="heading-display mb-3 text-balance">
                        Check your email
                    </h1>
                    <p className="mb-2 text-sm text-text-secondary text-pretty">
                        If an account exists for
                    </p>
                    <p className="mb-8 text-sm font-medium text-text-primary">
                        {email}
                    </p>
                    <p className="text-xs text-text-faint text-pretty">
                        we&apos;ve sent a password reset link. Click it to choose a new password.
                    </p>

                    <div className="mt-10 text-center text-xs text-text-faint">
                        Didn&apos;t receive an email?{" "}
                        <button
                            onClick={() => setEmailSent(false)}
                            className="link-underline"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-dvh items-center justify-center p-6 sm:p-12 overflow-hidden">
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-brand-green/[0.04] blur-[120px]" />
                <div className="absolute -bottom-40 -right-40 h-[400px] w-[400px] rounded-full bg-brand-violet/[0.05] blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-brand-blue/[0.02] blur-[120px]" />
            </div>

            <div className="relative w-full max-w-[400px] animate-fade-in">
                <Logo size="sm" showText className="mb-12" />

                <h1 className="heading-display mb-3 text-balance">
                    Reset your password
                </h1>
                <p className="mb-10 text-sm text-text-secondary text-pretty">
                    Enter your email and we&apos;ll send you a link to set a new password.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
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
                        {loading ? "SENDING..." : "SEND RESET LINK"}
                    </button>
                </form>

                <div className="mt-10 text-center text-xs text-text-faint">
                    <Link href="/login" className="link-underline inline-flex items-center gap-1.5">
                        <ArrowLeft className="h-3 w-3" />
                        Back to login
                    </Link>
                </div>
            </div>
        </div>
    );
}
