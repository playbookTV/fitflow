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
            <div className="flex min-h-screen items-center justify-center p-6 sm:p-12">
                <div className="w-full max-w-[400px] animate-fade-in text-center">
                    <Logo size="sm" showText className="mb-12" />

                    <div className="mb-6 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-green/10">
                        <Mail className="h-8 w-8 text-brand-green" />
                    </div>

                    <h1 className="mb-2 font-display text-2xl font-semibold text-text-primary">
                        Check your email
                    </h1>
                    <p className="mb-2 text-sm text-text-secondary">
                        We sent a verification link to
                    </p>
                    <p className="mb-8 text-sm font-medium text-text-primary">
                        {email}
                    </p>
                    <p className="text-xs text-text-faint">
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
        <div className="flex min-h-screen items-center justify-center p-6 sm:p-12">
            <div className="w-full max-w-[400px] animate-fade-in">
                {/* Logo */}
                <Logo size="sm" showText className="mb-12" />

                <h1 className="mb-2 font-display text-3xl font-semibold text-text-primary">
                    Start your clinic
                </h1>
                <p className="mb-10 text-sm text-text-secondary">
                    Join 500+ coaches managing their clients on WhatsApp.
                </p>

                <form onSubmit={handleRegister} className="space-y-6">
                    <div className="form-field">
                        <label className="label-mono">Full name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="input w-full"
                            placeholder="e.g. Coach Leslie"
                        />
                    </div>

                    <div className="form-field">
                        <label className="label-mono">Email address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input w-full"
                            placeholder="coach@fitflow.co"
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
