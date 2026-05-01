"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    User, CreditCard, UserPlus, MessageSquare,
    CheckCircle2, Loader2, ArrowRight, Dumbbell,
    Clock, Repeat, Settings2, Send, Smartphone, Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/tokens";
import { getAuthHeaders } from "@/lib/auth";
import { ChipSelect } from "@/components/setup/ChipSelect";
import { Logo } from "@/components/ui";
import posthog from "posthog-js";

// --- Constants ---

const SPECIALITIES = [
    { value: "weight_loss", label: "Weight loss" },
    { value: "strength", label: "Strength" },
    { value: "sports_performance", label: "Sports performance" },
    { value: "rehab", label: "Rehab" },
    { value: "general_fitness", label: "General fitness" },
    { value: "nutrition", label: "Nutrition" },
];

const CLIENT_RANGES = [
    { value: "STARTING", label: "0\u20135", description: "Just starting" },
    { value: "GROWING", label: "6\u201315", description: "Growing" },
    { value: "ESTABLISHED", label: "16+", description: "Established" },
];

const PAYMENT_MODELS = [
    {
        value: "SESSION_BLOCKS",
        label: "Session blocks",
        description: "Clients buy a pack of sessions upfront. FitFlow tracks remaining sessions.",
        icon: <Dumbbell className="w-5 h-5" />,
    },
    {
        value: "PER_SESSION",
        label: "Per session",
        description: "Each session is logged as a payable event.",
        icon: <Clock className="w-5 h-5" />,
    },
    {
        value: "MONTHLY_RETAINER",
        label: "Monthly retainer",
        description: "Fixed monthly amount regardless of session count.",
        icon: <Repeat className="w-5 h-5" />,
    },
    {
        value: "LATER",
        label: "Set up later",
        description: "Configure payment model per client.",
        icon: <Settings2 className="w-5 h-5" />,
    },
];

const GOAL_MAP: Record<string, string[]> = {
    weight_loss: ["Lose weight", "Body recomp"],
    strength: ["Build muscle", "Get stronger"],
    sports_performance: ["Improve performance", "Speed & agility"],
    rehab: ["Injury recovery", "Mobility"],
    general_fitness: ["General fitness", "Stay active"],
    nutrition: ["Better nutrition", "Meal planning"],
};

const ALL_GOALS = Array.from(new Set(Object.values(GOAL_MAP).flat()));

const MESSAGING_OPTIONS = [
    {
        value: "WHATSAPP",
        label: "WhatsApp",
        description: "Send workouts via WhatsApp Business API.",
        icon: <Smartphone className="w-5 h-5" />,
    },
    {
        value: "TELEGRAM",
        label: "Telegram",
        description: "Send workouts via per-coach Telegram bot.",
        icon: <Send className="w-5 h-5" />,
    },
    {
        value: "BOTH",
        label: "Both",
        description: "Use WhatsApp and Telegram. Assign per client.",
        icon: <MessageSquare className="w-5 h-5" />,
    },
    {
        value: "LATER",
        label: "Connect later",
        description: "Set up messaging from Settings.",
        icon: <Settings2 className="w-5 h-5" />,
    },
];

const TOTAL_STEPS = 5;

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// --- Types ---

interface SetupState {
    coachingName: string;
    specialities: string[];
    activeClientRange: string;
    paymentModel: string;
    clientName: string;
    clientEmail: string;
    clientGoal: string;
    sessionsPerBlock: string;
    pricePerSession: string;
    monthlyAmount: string;
    messagingChoice: string;
}

interface CreatedClient {
    client: {
        id: string;
        name: string;
    };
    sessionBlock: {
        totalSessions: number;
        pricePerSession: number;
    } | null;
}

// --- Component ---

function SetupContent() {
    const router = useRouter();
    const [step, setStep] = useState(0); // 0 = loading
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdClient, setCreatedClient] = useState<CreatedClient | null>(null);
    const [stripeLoading, setStripeLoading] = useState(false);
    const [stripeConnected, setStripeConnected] = useState(false);

    const [form, setForm] = useState<SetupState>({
        coachingName: "",
        specialities: [],
        activeClientRange: "",
        paymentModel: "",
        clientName: "",
        clientEmail: "",
        clientGoal: "",
        sessionsPerBlock: "10",
        pricePerSession: "",
        monthlyAmount: "",
        messagingChoice: "",
    });

    // Fetch coach profile for resume + pre-fill
    useEffect(() => {
        const fetchCoach = async () => {
            try {
                const headers = await getAuthHeaders();
                const res = await fetch(`${API_URL}/coaches/me`, { headers });
                if (!res.ok) return;

                const coach = await res.json();

                if (coach.onboardingCompleted) {
                    router.replace("/dashboard");
                    return;
                }

                if (coach.stripeConnected) {
                    setStripeConnected(true);
                }

                setForm((prev) => ({
                    ...prev,
                    coachingName: coach.name || "",
                    specialities: coach.specialities || [],
                    activeClientRange: coach.activeClientRange || "",
                    paymentModel: coach.defaultPaymentModel || "",
                }));

                // Handle Stripe redirect back to setup
                const params = new URLSearchParams(window.location.search);
                const stripeStatus = params.get("stripe");
                if (stripeStatus === "success") {
                    setStripeConnected(true);
                    setStep(TOTAL_STEPS + 1); // Advance to success screen
                    // Clean up the URL
                    window.history.replaceState({}, "", window.location.pathname);
                    return;
                }
                if (stripeStatus === "refresh") {
                    // Account link expired — resume at Stripe step
                    setStep(5);
                    window.history.replaceState({}, "", window.location.pathname);
                    return;
                }

                setStep(Math.max(1, (coach.onboardingStep || 0) + 1));
            } catch {
                setStep(1);
            } finally {
                setLoading(false);
            }
        };
        fetchCoach();
    }, [router]);

    // Filtered goals based on selected specialities
    const availableGoals = useMemo(() => {
        if (form.specialities.length === 0) return ALL_GOALS;
        return Array.from(
            new Set(form.specialities.flatMap((s) => GOAL_MAP[s] || []))
        );
    }, [form.specialities]);

    const saveStep = async (stepNum: number, data: Record<string, unknown>) => {
        try {
            const headers = await getAuthHeaders();
            await fetch(`${API_URL}/coaches/me`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify({ ...data, onboardingStep: stepNum }),
            });
        } catch {
            // Non-blocking — step data saved best-effort
        }
    };

    const handleNext = async () => {
        setSaving(true);
        setError(null);

        try {
            if (step === 1) {
                await saveStep(1, {
                    name: form.coachingName || undefined,
                    specialities: form.specialities,
                    activeClientRange: form.activeClientRange || undefined,
                });
            } else if (step === 2) {
                const model = form.paymentModel === "LATER" ? null : form.paymentModel || null;
                await saveStep(2, {
                    defaultPaymentModel: model,
                });
            } else if (step === 3) {
                // Step 3 creates a client
                await handleCreateClient();
                return;
            } else if (step === 4) {
                await saveStep(4, {});
            } else if (step === 5) {
                await saveStep(5, {});
            }

            setStep((s) => s + 1);
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleSkip = async () => {
        setSaving(true);
        try {
            await saveStep(step, {});

            if (step === 3) {
                // Skipping Step 3 → complete onboarding and go to dashboard
                const headers = await getAuthHeaders();
                await fetch(`${API_URL}/coaches/onboarding/complete`, {
                    method: "POST",
                    headers,
                });
                router.replace("/dashboard");
                return;
            }

            setStep((s) => s + 1);
        } catch {
            setStep((s) => s + 1);
        } finally {
            setSaving(false);
        }
    };

    const handleCreateClient = async () => {
        if (!form.clientName.trim()) {
            setError("Client name is required.");
            setSaving(false);
            return;
        }

        try {
            const headers = await getAuthHeaders();
            const body: Record<string, unknown> = {
                name: form.clientName.trim(),
                email: form.clientEmail.trim() || undefined,
                goals: form.clientGoal || undefined,
                source: "onboarding",
            };

            if (form.paymentModel === "SESSION_BLOCKS" && form.sessionsPerBlock && form.pricePerSession) {
                body.sessionBlock = {
                    totalSessions: parseInt(form.sessionsPerBlock),
                    pricePerSession: Math.round(parseFloat(form.pricePerSession) * 100),
                };
            } else if (form.paymentModel === "PER_SESSION" && form.pricePerSession) {
                body.sessionBlock = {
                    totalSessions: 1,
                    pricePerSession: Math.round(parseFloat(form.pricePerSession) * 100),
                };
            } else if (form.paymentModel === "MONTHLY_RETAINER" && form.monthlyAmount) {
                body.monthlyRate = Math.round(parseFloat(form.monthlyAmount) * 100);
            }

            const res = await fetch(`${API_URL}/clients`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create client");
            }

            const result = await res.json();
            setCreatedClient(result);
            await saveStep(3, {});
            setStep(4);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create client");
        } finally {
            setSaving(false);
        }
    };

    const handleComplete = async () => {
        setSaving(true);
        try {
            const headers = await getAuthHeaders();
            await fetch(`${API_URL}/coaches/onboarding/complete`, {
                method: "POST",
                headers,
            });
            posthog.capture("coach_setup_completed", {
                specialities: form.specialities,
                client_range: form.activeClientRange,
                payment_model: form.paymentModel,
                channel: form.messagingChoice,
            });
            router.replace("/dashboard");
        } catch {
            router.replace("/dashboard");
        }
    };

    const handleStripeConnect = async () => {
        setStripeLoading(true);
        setError(null);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_URL}/coaches/stripe/connect`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify({ returnPath: "/setup" }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                setError(data.error || "Failed to connect Stripe.");
            }
        } catch {
            setError("Failed to connect Stripe. Try again or skip for now.");
        } finally {
            setStripeLoading(false);
        }
    };

    if (loading || step === 0) {
        return (
            <div className="min-h-dvh bg-black text-white flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-brand-green" />
            </div>
        );
    }

    // Success state (step 5)
    if (step > TOTAL_STEPS) {
        return (
            <div className="min-h-dvh bg-mesh-gradient text-white flex items-center justify-center p-4">
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-green/10 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-blue/10 rounded-full blur-[120px]" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-lg w-full relative z-10"
                >
                    <div className="card-elevated backdrop-blur-xl shadow-card p-10 flex flex-col items-center text-center">
                        <div className="h-16 w-16 bg-brand-green rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 className="h-10 w-10 text-black" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-balance">
                            You&apos;re all set, Coach {form.coachingName || "there"}!
                        </h2>
                        <p className="text-text-secondary mb-8 text-pretty">
                            Your coaching dashboard is ready.
                        </p>

                        {/* Client summary card */}
                        {createdClient && (
                            <div className="w-full card p-5 mb-8 text-left">
                                <p className="text-xs text-text-faint uppercase tracking-widest font-bold mb-3">
                                    First client added
                                </p>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-text-secondary text-sm">Name</span>
                                        <span className="text-white text-sm font-medium">
                                            {createdClient.client.name}
                                        </span>
                                    </div>
                                    {form.clientGoal && (
                                        <div className="flex justify-between">
                                            <span className="text-text-secondary text-sm">Goal</span>
                                            <span className="text-white text-sm font-medium">
                                                {form.clientGoal}
                                            </span>
                                        </div>
                                    )}
                                    {createdClient.sessionBlock && (
                                        <>
                                            <div className="flex justify-between">
                                                <span className="text-text-secondary text-sm">Sessions</span>
                                                <span className="text-white text-sm font-medium tabular-nums">
                                                    {createdClient.sessionBlock.totalSessions}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-text-secondary text-sm">Block value</span>
                                                <span className="text-brand-green text-sm font-medium tabular-nums">
                                                    {formatCurrency(
                                                        (createdClient.sessionBlock.totalSessions *
                                                            createdClient.sessionBlock.pricePerSession) /
                                                        100,
                                                        "USD",
                                                    )}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Checklist */}
                        <div className="w-full text-left space-y-3 mb-8">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-4 h-4 text-brand-green flex-shrink-0" />
                                <span className="text-sm text-text-secondary">Client profile created</span>
                            </div>
                            {createdClient?.sessionBlock && (
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-4 h-4 text-brand-green flex-shrink-0" />
                                    <span className="text-sm text-text-secondary">
                                        Session block tracked ({createdClient.sessionBlock.totalSessions} sessions)
                                    </span>
                                </div>
                            )}
                            {form.specialities.length > 0 && (
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-4 h-4 text-brand-green flex-shrink-0" />
                                    <span className="text-sm text-text-secondary">
                                        {SPECIALITIES.find((s) => s.value === form.specialities[0])?.label} templates available
                                    </span>
                                </div>
                            )}
                            {stripeConnected && (
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-4 h-4 text-brand-green flex-shrink-0" />
                                    <span className="text-sm text-text-secondary">Stripe account connected</span>
                                </div>
                            )}

                            {/* Next actions */}
                            {createdClient && (
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 rounded-full border border-text-faint flex-shrink-0" />
                                    <Link
                                        href={`/dashboard/clients/${createdClient.client.id}`}
                                        className="text-sm text-brand-blue hover:underline text-left"
                                    >
                                        Assign first training plan
                                    </Link>
                                </div>
                            )}
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full border border-text-faint flex-shrink-0" />
                                <Link
                                    href="/dashboard/settings"
                                    className="text-sm text-brand-blue hover:underline text-left"
                                >
                                    Connect WhatsApp
                                </Link>
                            </div>
                        </div>

                        <button
                            onClick={handleComplete}
                            disabled={saving}
                            className="btn-primary w-full"
                        >
                            {saving ? "LOADING..." : "GO TO DASHBOARD"}
                            {!saving && <ArrowRight className="w-4 h-4" />}
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-dvh bg-mesh-gradient text-white flex flex-col items-center justify-center p-4">
            {/* Background decorations */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-blue/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-violet/10 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-xl relative z-10">
                {/* Header */}
                <div className="mb-8 text-center animation-fade-in">
                    <Logo size="sm" showText className="mb-8 justify-center" />
                    <h1 className="text-3xl font-bold tracking-tight mb-2 text-balance">Set up your coaching</h1>
                    <p className="text-text-secondary text-pretty">
                        {step === 1 && "Tell us about yourself so we can personalise your experience."}
                        {step === 2 && "How do you charge your clients?"}
                        {step === 3 && "Add your first client to activate your dashboard."}
                        {step === 4 && "Connect a messaging channel to deliver workouts."}
                        {step === 5 && "Connect Stripe to receive client payments directly."}
                    </p>
                </div>

                {/* Progress bar */}
                <div className="flex gap-2 mb-8 justify-center" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={TOTAL_STEPS} aria-label="Setup progress">
                    {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-1.5 w-12 rounded-full transition-colors duration-300",
                                step >= i ? "bg-brand-green" : "bg-border"
                            )}
                        />
                    ))}
                </div>

                {/* Step content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="card-elevated backdrop-blur-xl shadow-card overflow-hidden">
                            <div className="p-8 space-y-6">
                                {/* ---- Step 1: Profile ---- */}
                                {step === 1 && (
                                    <>
                                        <div className="flex items-center gap-3 mb-2">
                                            <User className="h-5 w-5 text-brand-blue" />
                                            <h2 className="text-xl font-semibold text-balance">Profile</h2>
                                        </div>

                                        <div className="form-field">
                                            <label className="label-mono" htmlFor="coachingName">
                                                Coaching name
                                            </label>
                                            <input
                                                id="coachingName"
                                                type="text"
                                                maxLength={40}
                                                className="input w-full"
                                                placeholder="e.g. Coach Leslie"
                                                value={form.coachingName}
                                                onChange={(e) =>
                                                    setForm({ ...form, coachingName: e.target.value })
                                                }
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label className="label-mono">Speciality</label>
                                            <ChipSelect
                                                options={SPECIALITIES}
                                                selected={form.specialities}
                                                onChange={(v) =>
                                                    setForm({ ...form, specialities: v as string[] })
                                                }
                                                multi
                                            />
                                            {form.specialities.length === 0 && (
                                                <p className="text-xs text-text-faint mt-2">
                                                    Pick at least one so we can suggest the right templates.
                                                </p>
                                            )}
                                        </div>

                                        <div className="form-field">
                                            <label className="label-mono">Active clients right now</label>
                                            <ChipSelect
                                                options={CLIENT_RANGES}
                                                selected={form.activeClientRange}
                                                onChange={(v) =>
                                                    setForm({ ...form, activeClientRange: v as string })
                                                }
                                            />
                                        </div>
                                    </>
                                )}

                                {/* ---- Step 2: Payment Preference ---- */}
                                {step === 2 && (
                                    <>
                                        <div className="flex items-center gap-3 mb-2">
                                            <CreditCard className="h-5 w-5 text-brand-violet" />
                                            <h2 className="text-xl font-semibold text-balance">Payment model</h2>
                                        </div>

                                        <ChipSelect
                                            options={PAYMENT_MODELS}
                                            selected={form.paymentModel}
                                            onChange={(v) =>
                                                setForm({ ...form, paymentModel: v as string })
                                            }
                                            variant="card"
                                        />

                                        <p className="text-xs text-text-faint">
                                            This sets the default for new clients. You can change it per client later.
                                        </p>
                                    </>
                                )}

                                {/* ---- Step 3: Add First Client ---- */}
                                {step === 3 && (
                                    <>
                                        <div className="flex items-center gap-3 mb-2">
                                            <UserPlus className="h-5 w-5 text-brand-green" />
                                            <h2 className="text-xl font-semibold text-balance">Add your first client</h2>
                                        </div>

                                        <div className="form-field">
                                            <label className="label-mono" htmlFor="clientName">
                                                Name *
                                            </label>
                                            <input
                                                id="clientName"
                                                type="text"
                                                required
                                                className="input w-full"
                                                placeholder="e.g. Sarah Johnson"
                                                value={form.clientName}
                                                onChange={(e) =>
                                                    setForm({ ...form, clientName: e.target.value })
                                                }
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label className="label-mono" htmlFor="clientEmail">
                                                Email (optional)
                                            </label>
                                            <input
                                                id="clientEmail"
                                                type="email"
                                                className="input w-full"
                                                placeholder="sarah@example.com"
                                                value={form.clientEmail}
                                                onChange={(e) =>
                                                    setForm({ ...form, clientEmail: e.target.value })
                                                }
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label className="label-mono">Primary goal</label>
                                            <ChipSelect
                                                options={availableGoals.map((g) => ({
                                                    value: g,
                                                    label: g,
                                                }))}
                                                selected={form.clientGoal}
                                                onChange={(v) =>
                                                    setForm({ ...form, clientGoal: v as string })
                                                }
                                            />
                                        </div>

                                        {/* Conditional payment fields */}
                                        {form.paymentModel === "SESSION_BLOCKS" && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="form-field">
                                                    <label className="label-mono" htmlFor="sessionsPerBlock">
                                                        Sessions per block
                                                    </label>
                                                    <input
                                                        id="sessionsPerBlock"
                                                        type="number"
                                                        min={1}
                                                        className="input w-full"
                                                        value={form.sessionsPerBlock}
                                                        onChange={(e) =>
                                                            setForm({
                                                                ...form,
                                                                sessionsPerBlock: e.target.value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <div className="form-field">
                                                    <label className="label-mono" htmlFor="pricePerSession">
                                                        Price per session
                                                    </label>
                                                    <input
                                                        id="pricePerSession"
                                                        type="number"
                                                        min={0}
                                                        step="0.01"
                                                        className="input w-full"
                                                        placeholder="0.00"
                                                        value={form.pricePerSession}
                                                        onChange={(e) =>
                                                            setForm({
                                                                ...form,
                                                                pricePerSession: e.target.value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {form.paymentModel === "PER_SESSION" && (
                                            <div className="form-field">
                                                <label className="label-mono" htmlFor="pricePerSessionSingle">
                                                    Price per session
                                                </label>
                                                <input
                                                    id="pricePerSessionSingle"
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    className="input w-full"
                                                    placeholder="0.00"
                                                    value={form.pricePerSession}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            pricePerSession: e.target.value,
                                                        })
                                                    }
                                                />
                                            </div>
                                        )}

                                        {form.paymentModel === "MONTHLY_RETAINER" && (
                                            <div className="form-field">
                                                <label className="label-mono" htmlFor="monthlyAmount">
                                                    Monthly amount
                                                </label>
                                                <input
                                                    id="monthlyAmount"
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    className="input w-full"
                                                    placeholder="0.00"
                                                    value={form.monthlyAmount}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            monthlyAmount: e.target.value,
                                                        })
                                                    }
                                                />
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* ---- Step 4: Connect Messaging ---- */}
                                {step === 4 && (
                                    <>
                                        <div className="flex items-center gap-3 mb-2">
                                            <MessageSquare className="h-5 w-5 text-brand-orange" />
                                            <h2 className="text-xl font-semibold text-balance">Connect messaging</h2>
                                        </div>

                                        <ChipSelect
                                            options={MESSAGING_OPTIONS}
                                            selected={form.messagingChoice}
                                            onChange={(v) =>
                                                setForm({ ...form, messagingChoice: v as string })
                                            }
                                            variant="card"
                                        />

                                        <p className="text-xs text-text-faint">
                                            You can always connect or change channels in Settings later.
                                        </p>
                                    </>
                                )}

                                {/* ---- Step 5: Connect Stripe ---- */}
                                {step === 5 && (
                                    <>
                                        <div className="flex items-center gap-3 mb-2">
                                            <Wallet className="h-5 w-5 text-brand-green" />
                                            <h2 className="text-xl font-semibold text-balance">Get paid</h2>
                                        </div>

                                        {stripeConnected ? (
                                            <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-green/10 border border-brand-green/20">
                                                <CheckCircle2 className="w-5 h-5 text-brand-green flex-shrink-0" />
                                                <div>
                                                    <p className="text-sm font-medium text-white">Stripe account connected</p>
                                                    <p className="text-xs text-text-faint mt-0.5">
                                                        Client payments will go directly to your bank account.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-sm text-text-secondary">
                                                    Connect your Stripe account so client payments go directly to your
                                                    bank account. FitFlow takes a small 10% platform fee &mdash; you keep the rest.
                                                </p>

                                                <button
                                                    type="button"
                                                    onClick={handleStripeConnect}
                                                    disabled={stripeLoading}
                                                    className="btn-primary w-full"
                                                >
                                                    {stripeLoading ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            CONNECTING...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Wallet className="mr-2 h-4 w-4" />
                                                            Connect Stripe
                                                        </>
                                                    )}
                                                </button>
                                            </>
                                        )}

                                        <p className="text-xs text-text-faint">
                                            You can also set this up later in Settings &gt; Integrations.
                                        </p>
                                    </>
                                )}
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="px-8 pb-2">
                                    <div className="form-error-box">{error}</div>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="px-8 pb-8 pt-4 flex justify-between bg-white/[0.02]">
                                <div className="flex gap-2">
                                    {step > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => setStep((s) => s - 1)}
                                            className="btn-ghost"
                                            disabled={saving}
                                        >
                                            Back
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleSkip}
                                        className="btn-ghost"
                                        disabled={saving}
                                    >
                                        {step === 3 ? "Skip \u2014 go to dashboard" : "Skip"}
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleNext}
                                    disabled={saving || (step === 3 && !form.clientName.trim())}
                                    className={cn(
                                        "btn-primary px-8",
                                        step === 3 && "bg-brand-green hover:shadow-glow-green border-brand-green"
                                    )}
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            SAVING...
                                        </>
                                    ) : step === 3 ? (
                                        "Add client"
                                    ) : step === 5 ? (
                                        stripeConnected ? "Finish" : "Skip"
                                    ) : (
                                        "Next"
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

export default function SetupPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-dvh bg-black text-white flex items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-brand-green" />
                </div>
            }
        >
            <SetupContent />
        </Suspense>
    );
}
