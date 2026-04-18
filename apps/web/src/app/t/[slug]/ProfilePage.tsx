"use client";

import { MessageSquare, Send, Copy, Check } from "lucide-react";
import { useState } from "react";

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

export default function ProfilePage({ data }: { data: ProfileData }) {
    const { coach, rates, channels, offers } = data;
    const [copied, setCopied] = useState(false);

    const profileUrl = `ftfw.fit/${coach.slug}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(`https://${profileUrl}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-dvh bg-bg-primary text-white">
            {/* Background accents */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-15%] left-[-10%] w-[40%] h-[40%] bg-brand-green/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-15%] right-[-10%] w-[40%] h-[40%] bg-brand-cyan/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 flex flex-col items-center px-4 py-12 max-w-md mx-auto">
                {/* Avatar */}
                <div className="mb-5">
                    {coach.avatarUrl ? (
                        <img
                            src={coach.avatarUrl}
                            alt={coach.name}
                            width={96}
                            height={96}
                            loading="lazy"
                            className="w-24 h-24 rounded-full object-cover border-2 border-white/10"
                        />
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-green to-brand-cyan flex items-center justify-center text-3xl font-bold text-black">
                            {getInitials(coach.name || coach.slug)}
                        </div>
                    )}
                </div>

                {/* Name */}
                <h1 className="text-2xl font-bold tracking-tight text-center text-balance" style={{ fontFamily: "var(--font-newsreader)" }}>
                    {coach.name || coach.slug}
                </h1>

                {/* Specialities */}
                {coach.specialities.length > 0 && (
                    <p className="text-sm text-text-secondary mt-2 text-center">
                        {coach.specialities
                            .map((s) => SPECIALITY_LABELS[s] || s)
                            .join(" · ")}
                    </p>
                )}

                {/* Slug URL (copyable) */}
                <button
                    onClick={handleCopy}
                    className="mt-3 flex items-center gap-2 text-xs text-text-faint font-mono hover:text-text-secondary transition-colors"
                >
                    <span>{profileUrl}</span>
                    {copied ? (
                        <Check className="w-3 h-3 text-brand-green" />
                    ) : (
                        <Copy className="w-3 h-3" />
                    )}
                </button>

                {/* Bio */}
                {coach.bio && (
                    <p className="mt-6 text-sm text-text-secondary text-center leading-relaxed max-w-sm text-pretty">
                        {coach.bio}
                    </p>
                )}

                {/* Rates */}
                {rates && (
                    <div className="mt-8 w-full">
                        <p className="label-mono text-center mb-3">Rates</p>
                        <div className="card p-5">
                            <RatesDisplay rates={rates} />
                        </div>
                    </div>
                )}

                {/* Channel Buttons */}
                {Object.keys(channels).length > 0 && (
                    <div className="mt-8 w-full space-y-3">
                        {channels.wb && (
                            <a
                                href={channels.wb}
                                onClick={() => logChannelClick(coach.slug, "wb")}
                                className="flex items-center justify-center gap-3 w-full py-3.5 px-6 rounded-xl bg-[#25D366] text-black font-mono text-sm font-bold tracking-wider hover:shadow-glow transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5"
                            >
                                <MessageSquare className="w-5 h-5" />
                                Message on WhatsApp
                            </a>
                        )}
                        {channels.tg && (
                            <a
                                href={channels.tg}
                                onClick={() => logChannelClick(coach.slug, "tg")}
                                className="flex items-center justify-center gap-3 w-full py-3.5 px-6 rounded-xl bg-[#2AABEE] text-white font-mono text-sm font-bold tracking-wider hover:shadow-[0_0_20px_rgba(42,171,238,0.3)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5"
                            >
                                <Send className="w-5 h-5" />
                                Message on Telegram
                            </a>
                        )}
                    </div>
                )}

                {/* Offers (as link cards) */}
                {offers.length > 0 && (
                    <div className="mt-8 w-full space-y-3">
                        <p className="label-mono text-center mb-3">Offers</p>
                        {offers.map((offer) => (
                            <a
                                key={offer.id}
                                href={`/${coach.slug}/${offer.slug}`}
                                className="card-interactive block p-4 text-center"
                            >
                                <span className="text-sm font-semibold text-white">
                                    {offer.name}
                                </span>
                            </a>
                        ))}
                    </div>
                )}

                {/* Powered by */}
                <p className="mt-12 text-[10px] text-text-faint font-mono uppercase tracking-widest">
                    Powered by FitFlow
                </p>
            </div>
        </div>
    );
}

function RatesDisplay({ rates }: { rates: NonNullable<ProfileData["rates"]> }) {
    const { paymentModel, currency, pricePerSession, sessionsPerBlock, monthlyRate } = rates;

    if (paymentModel === "SESSION_BLOCKS" && pricePerSession) {
        return (
            <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                    <span className="text-sm text-text-secondary">Per session</span>
                    <span className="text-lg font-bold text-white tabular-nums">{formatCurrency(pricePerSession, currency)}</span>
                </div>
                {sessionsPerBlock && (
                    <div className="flex items-baseline justify-between">
                        <span className="text-sm text-text-secondary">Block of {sessionsPerBlock}</span>
                        <span className="text-lg font-bold text-white tabular-nums">
                            {formatCurrency(pricePerSession * sessionsPerBlock, currency)}
                        </span>
                    </div>
                )}
            </div>
        );
    }

    if (paymentModel === "PER_SESSION" && pricePerSession) {
        return (
            <div className="flex items-baseline justify-between">
                <span className="text-sm text-text-secondary">Per session</span>
                <span className="text-lg font-bold text-white tabular-nums">{formatCurrency(pricePerSession, currency)}</span>
            </div>
        );
    }

    if (paymentModel === "MONTHLY_RETAINER" && monthlyRate) {
        return (
            <div className="flex items-baseline justify-between">
                <span className="text-sm text-text-secondary">Monthly</span>
                <span className="text-lg font-bold text-white tabular-nums">{formatCurrency(monthlyRate, currency)}</span>
            </div>
        );
    }

    return null;
}
