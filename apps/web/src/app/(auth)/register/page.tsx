"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui";
import { Mail } from "lucide-react";

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [emailSent, setEmailSent] = useState(false);
    const supabase = createClient();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                },
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setEmailSent(true);
            setLoading(false);
        }
    };

    if (emailSent) {
        return (
            <div className="relative flex min-h-dvh items-center justify-center p-6 sm:p-12 overflow-hidden">
                {/* Ambient background orbs */}
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
                        We sent a verification link to
                    </p>
                    <p className="mb-8 text-sm font-medium text-text-primary">
                        {email}
                    </p>
                    <p className="text-xs text-text-faint text-pretty">
                        Click the link in your email to verify your account, then log in.
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
            {/* Ambient background orbs */}
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-brand-green/[0.04] blur-[120px]" />
                <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-brand-cyan/[0.05] blur-[120px]" />
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-brand-violet/[0.02] blur-[120px]" />
            </div>

            <div className="relative w-full max-w-[400px] animate-fade-in">
                {/* Logo */}
                <Logo size="sm" showText className="mb-12" />

                <h1 className="heading-display mb-3 text-balance">
                    Start your clinic
                </h1>
                <p className="mb-10 text-sm text-text-secondary text-pretty">
                    Join 500+ coaches managing their clients on WhatsApp.
                </p>

                <form onSubmit={handleRegister} className="space-y-6">
                    <div className="form-field">
                        <label htmlFor="name" className="label-mono">Full name</label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            autoComplete="name"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="input w-full"
                            placeholder="e.g. Coach Leslie"
                        />
                    </div>

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
                            placeholder="coach@fitflow.co"
                        />
                    </div>

                    <div className="form-field">
                        <label htmlFor="password" className="label-mono">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input w-full"
                            placeholder="Create a strong password"
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
                        {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
                    </button>
                </form>

                <div className="mt-10 text-center text-xs text-text-faint">
                    Already have an account?{" "}
                    <Link href="/login" className="link-underline">
                        Log in instead
                    </Link>
                </div>
            </div>
        </div>
    );
}
