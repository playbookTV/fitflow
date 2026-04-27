"use client";

import { Copy, Check, ArrowUpRight, ArrowRight } from "lucide-react";
import { useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

interface ProfileData {
    coach: {
        name: string;
        slug: string;
        businessName: string | null;
        bio: string | null;
        avatarUrl: string | null;
        specialities: string[];
    };
    rates: {
        paymentModel: string;
        currency: string;
        pricePerSession: number | null;
        sessionsPerBlock: number | null;
        monthlyRate: number | null;
    } | null;
    channels: Record<string, string>;
    offers: Array<{
        id: string;
        name: string;
        slug: string;
        ctaType: string | null;
    }>;
}

function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat("en", {
        style: "currency",
        currency: currency.toUpperCase(),
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount / 100);
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

const SPECIALITY_LABELS: Record<string, string> = {
    weight_loss: "Weight Loss",
    strength: "Strength",
    sports_performance: "Sports Performance",
    rehab: "Rehab",
    general_fitness: "General Fitness",
    nutrition: "Nutrition",
};

function logChannelClick(slug: string, channel: string) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    fetch(`${apiUrl}/p/profile/${slug}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "channel_click", channel }),
    }).catch(() => {});
}

/* ── Motion configs ── */
const springDefault = { type: "spring" as const, stiffness: 300, damping: 30 };
const springSlow = { type: "spring" as const, stiffness: 200, damping: 25 };

const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: springDefault },
};

const badgeVariants = {
    hidden: { opacity: 0, x: -8 },
    visible: { opacity: 1, x: 0, transition: springDefault },
};

export default function ProfilePage({ data }: { data: ProfileData }) {
    const { coach, rates, channels, offers } = data;
    const [copied, setCopied] = useState(false);
    const prefersReduced = useReducedMotion();

    const profileUrl = `ftfw.fit/${coach.slug}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(`https://${profileUrl}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const motionProps = (v: Variants) =>
        prefersReduced
            ? {}
            : { variants: v, initial: "hidden" as const, animate: "visible" as const };

    return (
        <div className="min-h-[100dvh] bg-bg-primary text-white">
            {/* ── Background orbs ── */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                <div className="absolute top-[-20%] left-[-15%] w-[50%] h-[50%] bg-brand-green/[0.04] rounded-full blur-[160px]" />
                <div className="absolute top-[30%] right-[-20%] w-[40%] h-[40%] bg-brand-cyan/[0.03] rounded-full blur-[140px] animate-float" />
                <div className="absolute bottom-[-15%] left-[20%] w-[35%] h-[35%] bg-brand-violet/[0.03] rounded-full blur-[120px]" />
            </div>

            {/* ── Main layout ── */}
            <motion.div
                className="relative z-10 mx-auto max-w-5xl px-5 py-12 md:py-0 md:grid md:grid-cols-[380px_1fr] md:gap-16 md:min-h-[100dvh]"
                {...(prefersReduced
                    ? {}
                    : {
                          variants: containerVariants,
                          initial: "hidden",
                          animate: "visible",
                      })}
            >
                {/* ════════════════════════════════════
                    LEFT COLUMN — Identity (sticky on desktop)
                   ════════════════════════════════════ */}
                <div className="md:sticky md:top-0 md:h-[100dvh] md:flex md:flex-col md:justify-center md:py-24">
                    {/* Avatar */}
                    <motion.div className="mb-6" {...motionProps(itemVariants)}>
                        <div className="double-bezel w-fit">
                            <div className="double-bezel-inner p-1">
                                {coach.avatarUrl ? (
                                    <img
                                        src={coach.avatarUrl}
                                        alt={coach.name}
                                        width={128}
                                        height={128}
                                        loading="eager"
                                        className="w-28 h-28 md:w-32 md:h-32 rounded-2xl object-cover"
                                    />
                                ) : (
                                    <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-brand-green to-brand-cyan flex items-center justify-center text-4xl font-bold text-black">
                                        {getInitials(coach.name || coach.slug)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* Business name eyebrow */}
                    {coach.businessName && (
                        <motion.p
                            className="font-mono text-[11px] tracking-[0.08em] uppercase text-text-faint mb-2"
                            {...motionProps(itemVariants)}
                        >
                            {coach.businessName}
                        </motion.p>
                    )}

                    {/* Coach name */}
                    <motion.h1
                        className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-white leading-[1.1]"
                        {...motionProps(itemVariants)}
                    >
                        {coach.name || coach.slug}
                    </motion.h1>

                    {/* Specialities as pill badges */}
                    {coach.specialities.length > 0 && (
                        <motion.div
                            className="flex flex-wrap gap-2 mt-4"
                            {...(prefersReduced
                                ? {}
                                : {
                                      variants: {
                                          hidden: {},
                                          visible: {
                                              transition: {
                                                  staggerChildren: 0.05,
                                              },
                                          },
                                      },
                                      initial: "hidden",
                                      animate: "visible",
                                  })}
                        >
                            {coach.specialities.map((s) => (
                                <motion.span
                                    key={s}
                                    className="eyebrow"
                                    {...motionProps(badgeVariants)}
                                >
                                    {SPECIALITY_LABELS[s] || s}
                                </motion.span>
                            ))}
                        </motion.div>
                    )}

                    {/* Bio */}
                    {coach.bio && (
                        <motion.p
                            className="mt-6 text-base md:text-lg text-text-secondary leading-relaxed max-w-prose text-pretty"
                            {...motionProps(itemVariants)}
                        >
                            {coach.bio}
                        </motion.p>
                    )}

                    {/* Profile URL (copyable) */}
                    <motion.button
                        onClick={handleCopy}
                        aria-label={copied ? "Link copied" : "Copy profile link"}
                        className="mt-5 flex items-center gap-2 text-xs text-text-faint font-mono hover:text-text-secondary"
                        style={{ transition: "color 0.3s var(--ease-premium)" }}
                        {...motionProps(itemVariants)}
                    >
                        <span>{profileUrl}</span>
                        {copied ? (
                            <Check className="w-3.5 h-3.5 text-brand-green" />
                        ) : (
                            <Copy className="w-3.5 h-3.5" />
                        )}
                    </motion.button>
                </div>

                {/* ════════════════════════════════════
                    RIGHT COLUMN — Content (scrolls on desktop)
                   ════════════════════════════════════ */}
                <div className="mt-12 md:mt-0 md:py-24 space-y-12">
                    {/* ── Rates ── */}
                    {rates && (
                        <motion.section
                            {...(prefersReduced
                                ? {}
                                : {
                                      initial: { opacity: 0, y: 30 },
                                      whileInView: { opacity: 1, y: 0 },
                                      viewport: { once: true, margin: "-80px" },
                                      transition: springSlow,
                                  })}
                        >
                            <p className="label-ruled mb-5">Rates</p>
                            <div className="double-bezel">
                                <div className="double-bezel-inner p-6 border-l-2 border-l-brand-green">
                                    <RatesDisplay rates={rates} />
                                </div>
                            </div>
                        </motion.section>
                    )}

                    {/* ── Channel CTAs ── */}
                    {Object.keys(channels).length > 0 && (
                        <motion.section
                            className="space-y-4"
                            {...(prefersReduced
                                ? {}
                                : {
                                      initial: { opacity: 0, y: 30 },
                                      whileInView: { opacity: 1, y: 0 },
                                      viewport: { once: true, margin: "-80px" },
                                      transition: springSlow,
                                  })}
                        >
                            <p className="label-ruled mb-5">Get in touch</p>

                            {channels.wb && (
                                <motion.a
                                    href={channels.wb}
                                    onClick={() =>
                                        logChannelClick(coach.slug, "wb")
                                    }
                                    className="group flex items-center w-full rounded-2xl bg-brand-green text-black font-mono text-sm font-bold tracking-wider overflow-hidden"
                                    style={{
                                        transition:
                                            "box-shadow 0.4s var(--ease-premium), transform 0.4s var(--ease-premium)",
                                    }}
                                    whileHover={
                                        prefersReduced
                                            ? {}
                                            : { y: -2 }
                                    }
                                    whileTap={
                                        prefersReduced
                                            ? {}
                                            : { scale: 0.98 }
                                    }
                                    transition={springDefault}
                                >
                                    <span className="flex-1 py-4 pl-6">
                                        Message on WhatsApp
                                    </span>
                                    <span className="flex items-center justify-center w-14 h-full bg-black/10 border-l border-black/10">
                                        <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                                    </span>
                                </motion.a>
                            )}

                            {channels.tg && (
                                <motion.a
                                    href={channels.tg}
                                    onClick={() =>
                                        logChannelClick(coach.slug, "tg")
                                    }
                                    className="group flex items-center w-full rounded-2xl bg-brand-telegram text-white font-mono text-sm font-bold tracking-wider overflow-hidden"
                                    style={{
                                        transition:
                                            "box-shadow 0.4s var(--ease-premium), transform 0.4s var(--ease-premium)",
                                    }}
                                    whileHover={
                                        prefersReduced
                                            ? {}
                                            : { y: -2 }
                                    }
                                    whileTap={
                                        prefersReduced
                                            ? {}
                                            : { scale: 0.98 }
                                    }
                                    transition={springDefault}
                                >
                                    <span className="flex-1 py-4 pl-6">
                                        Message on Telegram
                                    </span>
                                    <span className="flex items-center justify-center w-14 h-full bg-white/10 border-l border-white/10">
                                        <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                                    </span>
                                </motion.a>
                            )}
                        </motion.section>
                    )}

                    {/* ── Offers ── */}
                    {offers.length > 0 && (
                        <motion.section
                            {...(prefersReduced
                                ? {}
                                : {
                                      initial: { opacity: 0, y: 30 },
                                      whileInView: { opacity: 1, y: 0 },
                                      viewport: { once: true, margin: "-80px" },
                                      transition: springSlow,
                                  })}
                        >
                            <p className="label-ruled mb-5">Offers</p>
                            <motion.div
                                className="space-y-3"
                                {...(prefersReduced
                                    ? {}
                                    : {
                                          variants: {
                                              hidden: {},
                                              visible: {
                                                  transition: {
                                                      staggerChildren: 0.06,
                                                  },
                                              },
                                          },
                                          initial: "hidden",
                                          whileInView: "visible",
                                          viewport: { once: true },
                                      })}
                            >
                                {offers.map((offer) => (
                                    <motion.a
                                        key={offer.id}
                                        href={`/${coach.slug}/${offer.slug}`}
                                        className="group block"
                                        variants={
                                            prefersReduced
                                                ? undefined
                                                : itemVariants
                                        }
                                        whileHover={
                                            prefersReduced
                                                ? {}
                                                : { y: -3 }
                                        }
                                        whileTap={
                                            prefersReduced
                                                ? {}
                                                : { scale: 0.99 }
                                        }
                                        transition={springDefault}
                                    >
                                        <div className="double-bezel group-hover:border-white/[0.08] transition-[border-color] duration-300">
                                            <div
                                                className="double-bezel-inner p-5 flex items-center justify-between group-hover:border-white/10 transition-[border-color,box-shadow] duration-300"
                                                style={{
                                                    borderLeft:
                                                        "2px solid transparent",
                                                    borderImage:
                                                        "linear-gradient(to bottom, #25D366, #26C6DA) 1",
                                                }}
                                            >
                                                <span className="text-[15px] font-semibold text-white">
                                                    {offer.name}
                                                </span>
                                                <ArrowRight className="w-4 h-4 text-text-faint group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                                            </div>
                                        </div>
                                    </motion.a>
                                ))}
                            </motion.div>
                        </motion.section>
                    )}

                    {/* ── Footer ── */}
                    <p className="text-[10px] text-text-faint font-mono uppercase tracking-widest pb-8">
                        Powered by FitFlow
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

/* ── Rates sub-component ── */
function RatesDisplay({ rates }: { rates: NonNullable<ProfileData["rates"]> }) {
    const {
        paymentModel,
        currency,
        pricePerSession,
        sessionsPerBlock,
        monthlyRate,
    } = rates;

    const currencyCode = currency.toUpperCase();

    if (paymentModel === "SESSION_BLOCKS" && pricePerSession) {
        return (
            <div className="space-y-5">
                <div className="flex items-end justify-between">
                    <span className="badge badge-green">{currencyCode}</span>
                </div>
                <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-text-faint">
                        Per session
                    </span>
                    <span className="font-display text-3xl font-semibold text-white tabular-nums">
                        {formatCurrency(pricePerSession, currency)}
                    </span>
                </div>
                {sessionsPerBlock && (
                    <>
                        <div className="h-px bg-border" />
                        <div className="flex items-baseline justify-between">
                            <span className="font-mono text-[11px] uppercase tracking-wider text-text-faint">
                                Block of {sessionsPerBlock}
                            </span>
                            <span className="font-display text-3xl font-semibold text-white tabular-nums">
                                {formatCurrency(
                                    pricePerSession * sessionsPerBlock,
                                    currency
                                )}
                            </span>
                        </div>
                    </>
                )}
            </div>
        );
    }

    if (paymentModel === "PER_SESSION" && pricePerSession) {
        return (
            <div className="space-y-4">
                <span className="badge badge-green">{currencyCode}</span>
                <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-text-faint">
                        Per session
                    </span>
                    <span className="font-display text-3xl font-semibold text-white tabular-nums">
                        {formatCurrency(pricePerSession, currency)}
                    </span>
                </div>
            </div>
        );
    }

    if (paymentModel === "MONTHLY_RETAINER" && monthlyRate) {
        return (
            <div className="space-y-4">
                <span className="badge badge-green">{currencyCode}</span>
                <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-text-faint">
                        Monthly
                    </span>
                    <span className="font-display text-3xl font-semibold text-white tabular-nums">
                        {formatCurrency(monthlyRate, currency)}
                    </span>
                </div>
            </div>
        );
    }

    return null;
}
