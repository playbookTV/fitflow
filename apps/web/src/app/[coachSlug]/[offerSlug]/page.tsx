"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Suspense } from "react";

interface OfferData {
    coach: { name: string; slug: string };
    offer: { id: string; name: string; slug: string; ctaType: string | null };
    channel: "WHATSAPP" | "TELEGRAM";
    source: string | null;
}

function IntakeContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const coachSlug = params.coachSlug as string;
    const offerSlug = params.offerSlug as string;

    const [offerData, setOfferData] = useState<OfferData | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        name: "",
        phone: "",
        email: "",
        goals: "",
    });

    useEffect(() => {
        const ch = searchParams.get("ch") || "";
        const src = searchParams.get("src") || "";
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

        fetch(`${apiUrl}/p/${coachSlug}/${offerSlug}?ch=${ch}&src=${src}`)
            .then((res) => {
                if (!res.ok) throw new Error("Offer not found");
                return res.json();
            })
            .then(setOfferData)
            .catch(() => setError("This offer link is not available."))
            .finally(() => setLoading(false));
    }, [coachSlug, offerSlug, searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !offerData) return;

        setSubmitting(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            const res = await fetch(
                `${apiUrl}/p/${coachSlug}/${offerSlug}/apply`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: form.name,
                        phone: form.phone || null,
                        email: form.email || null,
                        channel: offerData.channel,
                        source: offerData.source,
                        intakeData: { goals: form.goals },
                    }),
                }
            );

            if (res.ok) {
                setSubmitted(true);
            } else {
                setError("Something went wrong. Please try again.");
            }
        } catch {
            setError("Network error. Please check your connection.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-dvh bg-black text-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
            </div>
        );
    }

    if (error && !offerData) {
        return (
            <div className="min-h-dvh bg-black text-white flex items-center justify-center p-4">
                <div className="card max-w-md w-full p-8 text-center">
                    <p className="text-text-secondary">{error}</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-dvh bg-black text-white flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full"
                >
                    <div className="card border-brand-green/20 bg-brand-green/5 backdrop-blur-xl p-10 flex flex-col items-center text-center">
                        <div className="h-16 w-16 bg-brand-green rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 className="h-10 w-10 text-black" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Application Received!</h2>
                        <p className="text-text-secondary">
                            Thanks {form.name}! {offerData?.coach.name} will reach out to you
                            via {offerData?.channel === "TELEGRAM" ? "Telegram" : "WhatsApp"} shortly.
                        </p>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-dvh bg-mesh-gradient text-white flex flex-col items-center justify-center p-4">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-blue/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-violet/10 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-lg relative z-10">
                <div className="mb-8 text-center animate-fade-in">
                    <p className="text-xs text-text-faint font-mono uppercase tracking-widest mb-2">
                        {offerData?.coach.name}
                    </p>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">
                        {offerData?.offer.name}
                    </h1>
                    <p className="text-text-secondary text-sm">
                        Fill in your details to get started
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="card-elevated backdrop-blur-xl shadow-card overflow-hidden">
                        <div className="p-8 space-y-5">
                            <div className="form-field">
                                <label htmlFor="fullName" className="label-mono">Full Name *</label>
                                <input
                                    id="fullName"
                                    name="fullName"
                                    type="text"
                                    autoComplete="name"
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="input w-full"
                                    placeholder="Your name"
                                />
                            </div>

                            {offerData?.channel === "WHATSAPP" && (
                                <div className="form-field">
                                    <label htmlFor="phone" className="label-mono">WhatsApp Number</label>
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        autoComplete="tel"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        className="input w-full"
                                        placeholder="+44 7XXX XXX XXX"
                                    />
                                </div>
                            )}

                            <div className="form-field">
                                <label htmlFor="email" className="label-mono">Email</label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="input w-full"
                                    placeholder="you@example.com"
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="goals" className="label-mono">What are your goals?</label>
                                <textarea
                                    id="goals"
                                    name="goals"
                                    value={form.goals}
                                    onChange={(e) => setForm({ ...form, goals: e.target.value })}
                                    className="textarea w-full"
                                    placeholder="Lose weight, build muscle, improve fitness\u2026"
                                />
                            </div>

                            {error && (
                                <div className="form-error-box">{error}</div>
                            )}
                        </div>

                        <div className="px-8 pb-8 pt-4 bg-white/[0.02]">
                            <button
                                type="submit"
                                disabled={submitting || !form.name.trim()}
                                className="btn-primary w-full bg-brand-blue hover:shadow-glow-blue border-none"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Submitting...
                                    </>
                                ) : (
                                    offerData?.offer.ctaType?.toUpperCase() || "APPLY NOW"
                                )}
                            </button>
                        </div>
                    </div>
                </form>

                <p className="text-center text-[10px] text-text-faint mt-6 font-mono uppercase tracking-widest">
                    Powered by FitFlow
                </p>
            </div>
        </div>
    );
}

export default function PublicIntakePage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-dvh bg-black text-white flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
                </div>
            }
        >
            <IntakeContent />
        </Suspense>
    );
}
