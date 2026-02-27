"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui";

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
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
            },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            window.location.href = "/login?message=Check your email to verify your account.";
        }
    };

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
