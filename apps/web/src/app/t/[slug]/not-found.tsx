"use client";

import Link from "next/link";
import { UserX, ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const springDefault = { type: "spring" as const, stiffness: 300, damping: 30 };

export default function ProfileNotFound() {
    const prefersReduced = useReducedMotion();

    return (
        <div className="min-h-[100dvh] bg-bg-primary text-white overflow-hidden">
            {/* Ambient background orbs */}
            <div className="pointer-events-none fixed inset-0" aria-hidden="true">
                <div className="absolute -top-40 -right-40 h-[400px] w-[400px] rounded-full bg-brand-green/[0.03] blur-[160px]" />
                <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-brand-violet/[0.03] blur-[120px]" />
            </div>

            <div className="relative z-10 mx-auto max-w-5xl px-5 min-h-[100dvh] flex items-center md:grid md:grid-cols-[3fr_2fr] md:gap-16">
                {/* ── Left: content ── */}
                <motion.div
                    className="py-12 md:py-24"
                    initial={prefersReduced ? false : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={springDefault}
                >
                    <div className="double-bezel w-fit mb-8">
                        <div className="double-bezel-inner p-4">
                            <UserX className="w-7 h-7 text-text-faint" />
                        </div>
                    </div>

                    <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mb-3 text-balance">
                        Profile not found
                    </h1>
                    <p className="text-base text-text-secondary mb-10 text-pretty max-w-md">
                        This coach profile doesn&apos;t exist or is no longer
                        available.
                    </p>

                    <Link
                        href="https://fitflow.app"
                        className="group inline-flex items-center rounded-2xl bg-white/5 border border-white/10 text-white font-mono text-sm font-bold tracking-wider overflow-hidden hover:bg-white/10 hover:border-white/20 active:scale-[0.98]"
                        style={{
                            transition:
                                "background-color 0.4s var(--ease-premium), border-color 0.4s var(--ease-premium), transform 0.2s var(--ease-premium)",
                        }}
                    >
                        <span className="py-3.5 pl-6 pr-4">Go to FitFlow</span>
                        <span className="flex items-center justify-center w-12 h-full bg-white/5 border-l border-white/10">
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                        </span>
                    </Link>

                    <p className="mt-16 text-[10px] text-text-faint font-mono uppercase tracking-widest">
                        Powered by FitFlow
                    </p>
                </motion.div>

                {/* ── Right: decorative (desktop only) ── */}
                <div className="hidden md:flex items-center justify-center" aria-hidden="true">
                    <div className="relative">
                        <div className="text-[12rem] font-display font-bold text-white/[0.02] leading-none select-none">
                            404
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-transparent to-bg-primary" />
                    </div>
                </div>
            </div>
        </div>
    );
}
