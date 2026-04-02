"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui";

export default function LoginPage() {
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
            window.location.href = "/dashboard";
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
                    Don't have an account?{" "}
                    <Link href="/register" className="link-underline">
                        Create one for free
                    </Link>
                </div>
            </div>
        </div>
    );
}
