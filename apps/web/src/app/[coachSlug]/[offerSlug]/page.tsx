"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

interface OfferData {
    coach: { name: string; slug: string };
    offer: { id: string; name: string; slug: string; ctaType: string | null };
    channel: "WHATSAPP" | "TELEGRAM";
    source: string | null;
}

/* ── Motion configs ── */
const springDefault = { type: "spring" as const, stiffness: 300, damping: 30 };
const springBouncy = { type: "spring" as const, stiffness: 200, damping: 15 };

function IntakeContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const coachSlug = params.coachSlug as string;
    const offerSlug = params.offerSlug as string;
    const prefersReduced = useReducedMotion();

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

    /* ── Loading state ── */
    if (loading) {
        return (
            <div className="min-h-[100dvh] bg-bg-primary text-white flex items-center justify-center p-4">
                <div className="w-full max-w-lg space-y-6">
                    {/* Header skeleton */}
                    <div className="space-y-3">
                        <div className="h-3 w-24 skeleton rounded-full" />
                        <div className="h-8 w-64 skeleton rounded-lg" />
                        <div className="h-4 w-48 skeleton rounded-lg" />
                    </div>
                    {/* Form skeleton */}
                    <div className="double-bezel">
                        <div className="double-bezel-inner p-8 space-y-5">
                            <div className="space-y-2">
                                <div className="h-3 w-20 skeleton rounded" />
                                <div className="h-11 w-full skeleton rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <div className="h-3 w-16 skeleton rounded" />
                                <div className="h-11 w-full skeleton rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <div className="h-3 w-32 skeleton rounded" />
                                <div className="h-24 w-full skeleton rounded-xl" />
                            </div>
                            <div className="h-12 w-full skeleton rounded-2xl mt-4" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Error state (no offer data) ── */
    if (error && !offerData) {
        return (
            <div className="min-h-[100dvh] bg-bg-primary text-white flex items-center justify-center p-4">
                <motion.div
                    className="max-w-md w-full"
                    initial={prefersReduced ? false : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={springDefault}
                >
                    <div className="double-bezel">
                        <div className="double-bezel-inner p-10 text-center border-l-2 border-l-brand-red">
                            <p className="text-text-secondary">{error}</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    /* ── Main form / success ── */
    return (
        <div className="min-h-[100dvh] bg-bg-primary text-white">
            {/* Background orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] bg-brand-blue/[0.05] rounded-full blur-[160px]" />
                <div className="absolute bottom-[-10%] right-[-15%] w-[40%] h-[40%] bg-brand-violet/[0.04] rounded-full blur-[140px] animate-float" />
                <div className="absolute top-[50%] left-[60%] w-[30%] h-[30%] bg-brand-cyan/[0.03] rounded-full blur-[120px]" />
            </div>

            {/* Layout: split on desktop, stacked on mobile */}
            <div className="relative z-10 mx-auto max-w-5xl px-5 py-12 md:py-0 md:grid md:grid-cols-[2fr_3fr] md:gap-16 md:min-h-[100dvh]">
                {/* ── Left: Context panel ── */}
                <div className="md:sticky md:top-0 md:h-[100dvh] md:flex md:flex-col md:justify-center md:py-24">
                    <motion.div
                        initial={prefersReduced ? false : { opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={springDefault}
                    >
                        <p className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-faint mb-3">
                            {offerData?.coach.name}
                        </p>
                        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-white leading-[1.1] mb-3 text-balance">
                            {offerData?.offer.name}
                        </h1>
                        <p className="text-text-secondary text-sm text-pretty">
                            Fill in your details to get started
                        </p>

                        {/* Decorative accent — only on desktop */}
                        <div className="hidden md:block mt-12">
                            <div className="w-16 h-px bg-gradient-to-r from-brand-blue to-brand-violet" />
                        </div>
                    </motion.div>
                </div>

                {/* ── Right: Form / Success ── */}
                <div className="mt-10 md:mt-0 md:flex md:items-center md:py-24">
                    <div className="w-full">
                        <AnimatePresence mode="wait">
                            {submitted ? (
                                /* ── Success state ── */
                                <motion.div
                                    key="success"
                                    initial={
                                        prefersReduced
                                            ? false
                                            : { opacity: 0, x: 30 }
                                    }
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={springDefault}
                                    className="w-full"
                                >
                                    <div className="double-bezel">
                                        <div className="double-bezel-inner p-10 flex flex-col items-center text-center border-l-2 border-l-brand-green">
                                            <motion.div
                                                className="h-16 w-16 bg-brand-green rounded-2xl flex items-center justify-center mb-6"
                                                initial={
                                                    prefersReduced
                                                        ? false
                                                        : {
                                                              scale: 0,
                                                              rotate: -20,
                                                          }
                                                }
                                                animate={{
                                                    scale: 1,
                                                    rotate: 0,
                                                }}
                                                transition={springBouncy}
                                            >
                                                <CheckCircle2 className="h-9 w-9 text-black" />
                                            </motion.div>
                                            <h2 className="font-display text-2xl font-semibold mb-2 text-balance">
                                                Application Received
                                            </h2>
                                            <p className="text-text-secondary text-pretty max-w-sm">
                                                Thanks {form.name}!{" "}
                                                {offerData?.coach.name} will
                                                reach out to you via{" "}
                                                {offerData?.channel ===
                                                "TELEGRAM"
                                                    ? "Telegram"
                                                    : "WhatsApp"}{" "}
                                                shortly.
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                /* ── Form ── */
                                <motion.form
                                    key="form"
                                    onSubmit={handleSubmit}
                                    initial={
                                        prefersReduced
                                            ? false
                                            : { opacity: 0, y: 20 }
                                    }
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={
                                        prefersReduced
                                            ? { opacity: 0 }
                                            : { opacity: 0, x: -20 }
                                    }
                                    transition={springDefault}
                                    className="w-full"
                                >
                                    <div className="double-bezel">
                                        <div className="double-bezel-inner overflow-hidden">
                                            <div className="p-8 space-y-5">
                                                <div className="form-field">
                                                    <label
                                                        htmlFor="fullName"
                                                        className="label-mono"
                                                    >
                                                        Full Name *
                                                    </label>
                                                    <input
                                                        id="fullName"
                                                        name="fullName"
                                                        type="text"
                                                        autoComplete="name"
                                                        required
                                                        value={form.name}
                                                        onChange={(e) =>
                                                            setForm({
                                                                ...form,
                                                                name: e.target
                                                                    .value,
                                                            })
                                                        }
                                                        className="input w-full focus:shadow-[0_0_0_3px_rgba(78,151,248,0.1)]"
                                                        placeholder="Your name"
                                                    />
                                                </div>

                                                {offerData?.channel ===
                                                    "WHATSAPP" && (
                                                    <div className="form-field">
                                                        <label
                                                            htmlFor="phone"
                                                            className="label-mono"
                                                        >
                                                            WhatsApp Number
                                                        </label>
                                                        <input
                                                            id="phone"
                                                            name="phone"
                                                            type="tel"
                                                            autoComplete="tel"
                                                            value={form.phone}
                                                            onChange={(e) =>
                                                                setForm({
                                                                    ...form,
                                                                    phone: e
                                                                        .target
                                                                        .value,
                                                                })
                                                            }
                                                            className="input w-full focus:shadow-[0_0_0_3px_rgba(78,151,248,0.1)]"
                                                            placeholder="+44 7XXX XXX XXX"
                                                        />
                                                    </div>
                                                )}

                                                <div className="form-field">
                                                    <label
                                                        htmlFor="email"
                                                        className="label-mono"
                                                    >
                                                        Email
                                                    </label>
                                                    <input
                                                        id="email"
                                                        name="email"
                                                        type="email"
                                                        autoComplete="email"
                                                        value={form.email}
                                                        onChange={(e) =>
                                                            setForm({
                                                                ...form,
                                                                email: e.target
                                                                    .value,
                                                            })
                                                        }
                                                        className="input w-full focus:shadow-[0_0_0_3px_rgba(78,151,248,0.1)]"
                                                        placeholder="you@example.com"
                                                    />
                                                </div>

                                                <div className="form-field">
                                                    <label
                                                        htmlFor="goals"
                                                        className="label-mono"
                                                    >
                                                        What are your goals?
                                                    </label>
                                                    <textarea
                                                        id="goals"
                                                        name="goals"
                                                        value={form.goals}
                                                        onChange={(e) =>
                                                            setForm({
                                                                ...form,
                                                                goals: e.target
                                                                    .value,
                                                            })
                                                        }
                                                        className="textarea w-full focus:shadow-[0_0_0_3px_rgba(78,151,248,0.1)]"
                                                        placeholder="Lose weight, build muscle, improve fitness..."
                                                    />
                                                </div>

                                                {error && (
                                                    <div className="form-error-box">
                                                        {error}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Submit area */}
                                            <div className="px-8 pb-8 pt-4">
                                                <button
                                                    type="submit"
                                                    disabled={
                                                        submitting ||
                                                        !form.name.trim()
                                                    }
                                                    className="group flex items-center w-full rounded-2xl bg-brand-blue text-white font-mono text-sm font-bold tracking-wider overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_40px_rgba(78,151,248,0.2)] active:scale-[0.98]"
                                                    style={{
                                                        transition:
                                                            "box-shadow 0.4s var(--ease-premium), transform 0.2s var(--ease-premium)",
                                                    }}
                                                >
                                                    <span className="flex-1 py-4 pl-6 flex items-center justify-center gap-2">
                                                        {submitting ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                Submitting...
                                                            </>
                                                        ) : (
                                                            offerData?.offer.ctaType?.toUpperCase() ||
                                                            "APPLY NOW"
                                                        )}
                                                    </span>
                                                    {!submitting && (
                                                        <span className="flex items-center justify-center w-14 h-full bg-white/10 border-l border-white/10">
                                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                                                        </span>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.form>
                            )}
                        </AnimatePresence>

                        <p className="text-center text-[10px] text-text-faint mt-12 font-mono uppercase tracking-widest">
                            Powered by FitFlow
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PublicIntakePage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-[100dvh] bg-bg-primary text-white flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
                </div>
            }
        >
            <IntakeContent />
        </Suspense>
    );
}
