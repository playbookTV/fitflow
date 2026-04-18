"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Dumbbell, Activity, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

function OnboardingContent() {
    const searchParams = useSearchParams();
    const clientId = searchParams.get("id");
    const token = searchParams.get("token");

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [clientName, setClientName] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const [formData, setFormData] = useState({
        goals: "",
        experience: "",
        equipment: "",
        medicalNotes: ""
    });

    useEffect(() => {
        if (clientId && token) {
            fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/intake/${clientId}?token=${encodeURIComponent(token)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.name) setClientName(data.name);
                })
                .catch(err => console.error("Error fetching client info", err));
        }
    }, [clientId, token]);

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/intake`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clientId, token, ...formData })
            });
            if (res.ok) {
                setSubmitted(true);
            }
        } catch (error) {
            console.error("Submission failed", error);
        } finally {
            setLoading(false);
        }
    };

    if (!clientId || !token) {
        return (
            <div className="min-h-dvh bg-black text-white flex items-center justify-center p-4">
                <div className="card max-w-md w-full p-8 border-border bg-bg-card/50">
                    <p className="text-center text-text-secondary">Invalid onboarding link. Please check your message.</p>
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
                        <h2 className="text-2xl font-bold mb-2 text-balance">You&apos;re All Set!</h2>
                        <p className="text-text-secondary mb-8 text-pretty">
                            Thanks {clientName || "there"}! Your goals and info have been sent to your coach.
                            They will notify you once your custom plan is ready.
                        </p>
                        <button onClick={() => window.close()} className="btn-secondary">
                            Close Window
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-dvh bg-mesh-gradient text-white flex flex-col items-center justify-center p-4">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-blue/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-violet/10 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-xl relative z-10">
                <div className="mb-8 text-center animation-fade-in">
                    <h1 className="text-3xl font-bold tracking-tight mb-2 text-balance">Welcome to FitFlow</h1>
                    <p className="text-text-secondary text-pretty">Let&apos;s personalize your fitness journey, {clientName || "there"}.</p>
                </div>

                <div className="flex gap-2 mb-8 justify-center">
                    {[1, 2, 3].map(i => (
                        <div
                            key={i}
                            className={cn(
                                "h-1.5 w-12 rounded-full transition-colors duration-300",
                                step >= i ? 'bg-brand-blue' : 'bg-border'
                            )}
                        />
                    ))}
                </div>

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
                                {step === 1 && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Heart className="h-5 w-5 text-brand-red" />
                                            <h2 className="text-xl font-semibold text-balance">Your Goals</h2>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="label-mono" htmlFor="goals">What are you hoping to achieve?</label>
                                                <textarea
                                                    id="goals"
                                                    name="goals"
                                                    placeholder="Example: Lose 5kg, build muscle, improve flexibility\u2026"
                                                    className="textarea w-full"
                                                    value={formData.goals}
                                                    onChange={e => setFormData({ ...formData, goals: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="label-mono" htmlFor="experience">Fitness Experience</label>
                                                <input
                                                    id="experience"
                                                    name="experience"
                                                    placeholder="Example: Beginner, 2 years lifting, etc."
                                                    className="input w-full"
                                                    value={formData.experience}
                                                    onChange={e => setFormData({ ...formData, experience: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Dumbbell className="h-5 w-5 text-brand-blue" />
                                            <h2 className="text-xl font-semibold text-balance">Environment</h2>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="label-mono" htmlFor="equipment">What equipment do you have access to?</label>
                                                <textarea
                                                    id="equipment"
                                                    name="equipment"
                                                    placeholder="Full gym, dumbbells only, bodyweight\u2026"
                                                    className="textarea w-full"
                                                    value={formData.equipment}
                                                    onChange={e => setFormData({ ...formData, equipment: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Activity className="h-5 w-5 text-brand-orange" />
                                            <h2 className="text-xl font-semibold text-balance">Health & Readiness</h2>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="label-mono" htmlFor="medical">Any injuries or medical conditions?</label>
                                                <textarea
                                                    id="medical"
                                                    name="medicalNotes"
                                                    placeholder="Previous knee surgery, lower back pain, none\u2026"
                                                    className="textarea w-full"
                                                    value={formData.medicalNotes}
                                                    onChange={e => setFormData({ ...formData, medicalNotes: e.target.value })}
                                                />
                                            </div>
                                            <p className="text-[10px] text-text-faint italic font-mono uppercase tracking-widest">
                                                Note: This information is only visible to your coach.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="px-8 pb-8 pt-4 flex justify-between bg-white/[0.02]">
                                {step > 1 ? (
                                    <button onClick={handleBack} className="btn-ghost">
                                        Back
                                    </button>
                                ) : (
                                    <div />
                                )}

                                {step < 3 ? (
                                    <button onClick={handleNext} className="btn-primary px-8">
                                        Next
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading}
                                        className="btn-primary bg-brand-blue hover:shadow-glow-blue border-none px-8"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                SAVING...
                                            </>
                                        ) : "Complete Setup"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

export default function OnboardingPage() {
    return (
        <Suspense fallback={
            <div className="min-h-dvh bg-black text-white flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-brand-blue" />
            </div>
        }>
            <OnboardingContent />
        </Suspense>
    );
}

