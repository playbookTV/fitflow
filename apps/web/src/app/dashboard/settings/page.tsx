"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { getAuthHeaders } from "@/lib/auth";
import {
    User,
    Building2,
    Bell,
    CreditCard,
    MessageSquare,
    Globe,
    Save,
    Check,
    ExternalLink,
    Smartphone,
    Send,
    Copy,
    Link2,
    QrCode,
    Download,
    MousePointerClick,
    Eye,
    EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AvatarUpload } from "@/components/ui/AvatarUpload";
import { WhatsAppRulesSection } from "@/components/WhatsAppRulesSection";

interface CoachProfile {
    id: string;
    name: string;
    email: string;
    phone: string;
    slug: string;
    businessName?: string;
    timezone: string;
    notifications: {
        emailAlerts: boolean;
        smsReminders: boolean;
        weeklyDigest: boolean;
    };
    bio?: string;
    avatarUrl?: string;
    profileVisible: boolean;
    showRatesPublicly: boolean;
    showWhatsapp: boolean;
    showTelegram: boolean;
    defaultPaymentModel?: string;
    defaultPricePerSession?: number;
    defaultSessionsPerBlock?: number;
    defaultMonthlyRate?: number;
    stripeConnected: boolean;
    whatsappConnected: boolean;
    telegramConnected: boolean;
    telegramBotUsername: string | null;
    telegramDeepLink: string | null;
}

type TabId = "profile" | "public-profile" | "notifications" | "integrations" | "billing";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "public-profile", label: "Public Profile", icon: Globe },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "integrations", label: "Integrations", icon: MessageSquare },
    { id: "billing", label: "Billing", icon: CreditCard },
];

const timezones = [
    { value: "Africa/Lagos", label: "Lagos (WAT)" },
    { value: "Africa/Johannesburg", label: "Johannesburg (SAST)" },
    { value: "Europe/London", label: "London (GMT/BST)" },
    { value: "America/New_York", label: "New York (EST/EDT)" },
    { value: "America/Los_Angeles", label: "Los Angeles (PST/PDT)" },
    { value: "Asia/Dubai", label: "Dubai (GST)" },
];

function ShareLinkRow({ label, url }: { label: string; url: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(`https://${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-bg-hover">
            <div>
                <p className="text-xs text-text-faint">{label}</p>
                <code className="text-sm text-brand-green font-mono">{url}</code>
            </div>
            <button onClick={handleCopy} className="btn-ghost !p-2" aria-label={`Copy ${label} link`}>
                {copied ? (
                    <Check className="w-4 h-4 text-brand-green" />
                ) : (
                    <Copy className="w-4 h-4" />
                )}
            </button>
        </div>
    );
}

function SettingsContent() {
    const [activeTab, setActiveTab] = useState<TabId>("profile");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [profile, setProfile] = useState<CoachProfile>({
        id: "",
        name: "",
        email: "",
        phone: "",
        slug: "",
        businessName: "",
        timezone: "Africa/Lagos",
        notifications: {
            emailAlerts: true,
            smsReminders: false,
            weeklyDigest: true,
        },
        profileVisible: true,
        showRatesPublicly: true,
        showWhatsapp: true,
        showTelegram: true,
        stripeConnected: false,
        whatsappConnected: false,
        telegramConnected: false,
        telegramBotUsername: null,
        telegramDeepLink: null,
    });
    const [linkCopied, setLinkCopied] = useState(false);
    const [waLinkCopied, setWaLinkCopied] = useState(false);
    const [waLink, setWaLink] = useState<string | null>(null);
    const [waPhoneNumber, setWaPhoneNumber] = useState<string | null>(null);
    const [stripeLoading, setStripeLoading] = useState(false);
    const [shortLinks, setShortLinks] = useState<{ id: string; code: string; targetUrl: string; label: string | null; clicks: number; shortUrl: string }[]>([]);
    const [showQrId, setShowQrId] = useState<string | null>(null);
    const searchParams = useSearchParams();

    const handleStripeConnect = useCallback(async () => {
        setStripeLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/coaches/stripe/connect`, {
                method: "POST",
                headers: await getAuthHeaders(),
            });
            if (res.ok) {
                const { url } = await res.json();
                window.location.href = url;
            }
        } catch (error) {
            console.error("Failed to initiate Stripe Connect:", error);
        } finally {
            setStripeLoading(false);
        }
    }, []);

    const handleStripeDashboard = useCallback(async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/coaches/stripe/dashboard`, {
                headers: await getAuthHeaders(),
            });
            if (res.ok) {
                const { url } = await res.json();
                window.open(url, "_blank");
            }
        } catch (error) {
            console.error("Failed to open Stripe dashboard:", error);
        }
    }, []);

    // Handle Stripe onboarding return
    useEffect(() => {
        const stripeParam = searchParams.get("stripe");
        if (stripeParam === "refresh") {
            handleStripeConnect();
        } else if (stripeParam === "success") {
            setActiveTab("integrations");
        }
    }, [searchParams, handleStripeConnect]);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/coaches/me`,
                    {
                        headers: await getAuthHeaders(),
                    }
                );
                if (response.ok) {
                    const data = await response.json();
                    setProfile((prev) => ({ ...prev, ...data }));
                }
            } catch (error) {
                console.error("Failed to fetch profile:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();

        const fetchChannels = async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/coaches/channels`,
                    { headers: await getAuthHeaders() }
                );
                if (res.ok) {
                    const data = await res.json();
                    setWaLink(data.whatsapp?.waLink || null);
                    setWaPhoneNumber(data.whatsapp?.phoneNumber || null);
                }
            } catch { /* silent */ }
        };
        fetchChannels();

        const fetchShortLinks = async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/short-links`,
                    { headers: await getAuthHeaders() }
                );
                if (res.ok) setShortLinks(await res.json());
            } catch { /* silent */ }
        };
        fetchShortLinks();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/coaches/me`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        ...(await getAuthHeaders()),
                    },
                    body: JSON.stringify({
                        name: profile.name,
                        slug: profile.slug || undefined,
                        phone: profile.phone,
                        businessName: profile.businessName,
                        timezone: profile.timezone,
                        notifications: profile.notifications,
                        bio: profile.bio || null,
                        avatarUrl: profile.avatarUrl || null,
                        profileVisible: profile.profileVisible,
                        showRatesPublicly: profile.showRatesPublicly,
                        showWhatsapp: profile.showWhatsapp,
                        showTelegram: profile.showTelegram,
                        defaultPricePerSession: profile.defaultPricePerSession || null,
                        defaultSessionsPerBlock: profile.defaultSessionsPerBlock || null,
                        defaultMonthlyRate: profile.defaultMonthlyRate || null,
                    }),
                }
            );
            if (response.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            }
        } catch (error) {
            console.error("Failed to save profile:", error);
        } finally {
            setSaving(false);
        }
    };

    const updateProfile = (updates: Partial<CoachProfile>) => {
        setProfile((prev) => ({ ...prev, ...updates }));
    };

    const copyDeepLink = () => {
        if (profile.telegramDeepLink) {
            navigator.clipboard.writeText(profile.telegramDeepLink);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        }
    };

    const updateNotification = (key: keyof CoachProfile["notifications"], value: boolean) => {
        setProfile((prev) => ({
            ...prev,
            notifications: { ...prev.notifications, [key]: value },
        }));
    };

    return (
        <DashboardLayout
            title="Settings"
            subtitle="Manage your account and preferences"
            actions={
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={cn(
                        "btn-primary",
                        saved && "!bg-brand-green !border-brand-green"
                    )}
                >
                    {saved ? (
                        <>
                            <Check className="w-4 h-4" />
                            SAVED
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            {saving ? "SAVING..." : "SAVE CHANGES"}
                        </>
                    )}
                </button>
            }
        >
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Tab Navigation */}
                <div className="lg:w-64 flex-shrink-0">
                    <nav className="flex lg:flex-col gap-2">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-200 text-left",
                                        activeTab === tab.id
                                            ? "bg-brand-green/10 text-brand-green border border-brand-green/20"
                                            : "text-text-secondary hover:text-white hover:bg-bg-hover"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 max-w-2xl">
                    {loading ? (
                        <div className="space-y-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="skeleton h-24 rounded-2xl" />
                            ))}
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            {/* Profile Tab */}
                            {activeTab === "profile" && (
                                <motion.div key="profile" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="space-y-8">
                                    <div className="card p-6">
                                        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2 text-balance">
                                            <User className="w-5 h-5 text-brand-blue" />
                                            Personal Information
                                        </h3>
                                        <div className="space-y-5">
                                            <div className="form-field">
                                                <label htmlFor="settings-name" className="label">Full Name</label>
                                                <input
                                                    id="settings-name"
                                                    type="text"
                                                    name="name"
                                                    autoComplete="name"
                                                    value={profile.name}
                                                    onChange={(e) =>
                                                        updateProfile({ name: e.target.value })
                                                    }
                                                    className="input"
                                                    placeholder="Your full name"
                                                />
                                            </div>
                                            <div className="form-field">
                                                <label htmlFor="settings-email" className="label">Email Address</label>
                                                <input
                                                    id="settings-email"
                                                    type="email"
                                                    name="email"
                                                    autoComplete="email"
                                                    value={profile.email}
                                                    disabled
                                                    className="input opacity-60 cursor-not-allowed"
                                                />
                                                <p className="text-xs text-text-faint mt-1 text-pretty">
                                                    Contact support to change your email
                                                </p>
                                            </div>
                                            <div className="form-field">
                                                <label htmlFor="settings-phone" className="label">Phone Number</label>
                                                <input
                                                    id="settings-phone"
                                                    type="tel"
                                                    name="phone"
                                                    autoComplete="tel"
                                                    value={profile.phone}
                                                    onChange={(e) =>
                                                        updateProfile({ phone: e.target.value })
                                                    }
                                                    className="input"
                                                    placeholder="+234 XXX XXX XXXX"
                                                />
                                            </div>
                                            <div className="form-field">
                                                <label htmlFor="settings-slug" className="label">Slug</label>
                                                <input
                                                    id="settings-slug"
                                                    type="text"
                                                    name="slug"
                                                    autoComplete="off"
                                                    value={profile.slug}
                                                    onChange={(e) =>
                                                        updateProfile({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })
                                                    }
                                                    className="input"
                                                    placeholder="e.g. leslie-fitness"
                                                />
                                                <p className="text-[10px] text-text-faint mt-1">
                                                    Used for your public profile and Telegram invite link
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card p-6">
                                        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2 text-balance">
                                            <Building2 className="w-5 h-5 text-brand-violet" />
                                            Business Details
                                        </h3>
                                        <div className="space-y-5">
                                            <div className="form-field">
                                                <label htmlFor="settings-business-name" className="label">Business Name</label>
                                                <input
                                                    id="settings-business-name"
                                                    type="text"
                                                    name="businessName"
                                                    autoComplete="organization"
                                                    value={profile.businessName || ""}
                                                    onChange={(e) =>
                                                        updateProfile({ businessName: e.target.value })
                                                    }
                                                    className="input"
                                                    placeholder="Your fitness business name"
                                                />
                                            </div>
                                            <div className="form-field">
                                                <label htmlFor="settings-timezone" className="label flex items-center gap-2">
                                                    <Globe className="w-3.5 h-3.5" />
                                                    Timezone
                                                </label>
                                                <select
                                                    id="settings-timezone"
                                                    name="timezone"
                                                    value={profile.timezone}
                                                    onChange={(e) =>
                                                        updateProfile({ timezone: e.target.value })
                                                    }
                                                    className="select"
                                                >
                                                    {timezones.map((tz) => (
                                                        <option key={tz.value} value={tz.value}>
                                                            {tz.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                <p className="text-xs text-text-faint mt-1 text-pretty">
                                                    Used for scheduling workout deliveries
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Public Profile Tab */}
                            {activeTab === "public-profile" && (
                                <motion.div key="public-profile" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="space-y-8">
                                    {/* Status Indicator */}
                                    <div className={cn(
                                        "flex items-center gap-3 p-4 rounded-xl border",
                                        profile.profileVisible
                                            ? "border-brand-green/20 bg-brand-green/5"
                                            : "border-brand-red/20 bg-brand-red/5"
                                    )}>
                                        {profile.profileVisible ? (
                                            <Eye className="w-4 h-4 text-brand-green" />
                                        ) : (
                                            <EyeOff className="w-4 h-4 text-brand-red" />
                                        )}
                                        <span className={cn(
                                            "text-sm font-medium",
                                            profile.profileVisible ? "text-brand-green" : "text-brand-red"
                                        )}>
                                            {profile.profileVisible && profile.slug
                                                ? `Profile live at ftfw.fit/${profile.slug}`
                                                : profile.profileVisible && !profile.slug
                                                    ? "Set a slug to publish your profile"
                                                    : "Profile hidden"}
                                        </span>
                                    </div>

                                    {/* Bio & Avatar */}
                                    <div className="card p-6">
                                        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2 text-balance">
                                            <User className="w-5 h-5 text-brand-green" />
                                            Profile Page
                                        </h3>
                                        <div className="flex flex-col sm:flex-row gap-6 items-start">
                                            <div className="flex-shrink-0 self-center sm:self-start">
                                                <AvatarUpload
                                                    currentUrl={profile.avatarUrl || null}
                                                    name={profile.name || profile.slug || "Coach"}
                                                    onUploaded={(url) => updateProfile({ avatarUrl: url || undefined })}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0 w-full">
                                                <div className="form-field">
                                                    <label htmlFor="settings-bio" className="label">Bio</label>
                                                    <textarea
                                                        id="settings-bio"
                                                        name="bio"
                                                        value={profile.bio || ""}
                                                        onChange={(e) => {
                                                            if (e.target.value.length <= 200) {
                                                                updateProfile({ bio: e.target.value });
                                                            }
                                                        }}
                                                        className="textarea"
                                                        placeholder="Tell potential clients about yourself\u2026"
                                                        rows={3}
                                                    />
                                                    <p className="text-xs text-text-faint mt-1 text-right tabular-nums">
                                                        {(profile.bio || "").length} / 200
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Default Rates */}
                                    <div className="card p-6">
                                        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2 text-balance">
                                            <CreditCard className="w-5 h-5 text-brand-cyan" />
                                            Default Rates
                                        </h3>
                                        <p className="text-xs text-text-faint mb-5 text-pretty">
                                            These are displayed on your public profile. Per-client rates may differ.
                                        </p>
                                        <div className="space-y-5">
                                            {(profile.defaultPaymentModel === "SESSION_BLOCKS" || profile.defaultPaymentModel === "PER_SESSION") && (
                                                <div className="form-field">
                                                    <label htmlFor="settings-price-per-session" className="label">Price per session (in smallest currency unit)</label>
                                                    <input
                                                        id="settings-price-per-session"
                                                        type="number"
                                                        name="defaultPricePerSession"
                                                        value={profile.defaultPricePerSession || ""}
                                                        onChange={(e) =>
                                                            updateProfile({ defaultPricePerSession: e.target.value ? Number(e.target.value) : undefined })
                                                        }
                                                        className="input"
                                                        placeholder="e.g. 4000 for £40"
                                                    />
                                                </div>
                                            )}
                                            {profile.defaultPaymentModel === "SESSION_BLOCKS" && (
                                                <div className="form-field">
                                                    <label htmlFor="settings-sessions-per-block" className="label">Sessions per block</label>
                                                    <input
                                                        id="settings-sessions-per-block"
                                                        type="number"
                                                        name="defaultSessionsPerBlock"
                                                        value={profile.defaultSessionsPerBlock || ""}
                                                        onChange={(e) =>
                                                            updateProfile({ defaultSessionsPerBlock: e.target.value ? Number(e.target.value) : undefined })
                                                        }
                                                        className="input"
                                                        placeholder="e.g. 10"
                                                    />
                                                </div>
                                            )}
                                            {profile.defaultPaymentModel === "MONTHLY_RETAINER" && (
                                                <div className="form-field">
                                                    <label htmlFor="settings-monthly-rate" className="label">Monthly rate (in smallest currency unit)</label>
                                                    <input
                                                        id="settings-monthly-rate"
                                                        type="number"
                                                        name="defaultMonthlyRate"
                                                        value={profile.defaultMonthlyRate || ""}
                                                        onChange={(e) =>
                                                            updateProfile({ defaultMonthlyRate: e.target.value ? Number(e.target.value) : undefined })
                                                        }
                                                        className="input"
                                                        placeholder="e.g. 12000 for £120"
                                                    />
                                                </div>
                                            )}
                                            {!profile.defaultPaymentModel && (
                                                <p className="text-sm text-text-secondary text-pretty">
                                                    Set a payment model in Setup to configure rates.
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Visibility Toggles */}
                                    <div className="card p-6">
                                        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2 text-balance">
                                            <Eye className="w-5 h-5 text-brand-violet" />
                                            Visibility
                                        </h3>
                                        <div className="space-y-4">
                                            <label className="flex items-center justify-between p-4 rounded-xl bg-bg-hover cursor-pointer">
                                                <div>
                                                    <p className="font-medium text-white">Profile page live</p>
                                                    <p className="text-sm text-text-faint text-pretty">
                                                        Make your profile visible at ftfw.fit/{profile.slug || "your-slug"}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => updateProfile({ profileVisible: !profile.profileVisible })}
                                                    role="switch"
                                                    aria-checked={profile.profileVisible}
                                                    className={cn(
                                                        "toggle",
                                                        profile.profileVisible && "toggle-active"
                                                    )}
                                                >
                                                    <span className="toggle-thumb" />
                                                </button>
                                            </label>
                                            <label className="flex items-center justify-between p-4 rounded-xl bg-bg-hover cursor-pointer">
                                                <div>
                                                    <p className="font-medium text-white">Show rates publicly</p>
                                                    <p className="text-sm text-text-faint text-pretty">
                                                        Display your pricing on the profile page
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => updateProfile({ showRatesPublicly: !profile.showRatesPublicly })}
                                                    role="switch"
                                                    aria-checked={profile.showRatesPublicly}
                                                    className={cn(
                                                        "toggle",
                                                        profile.showRatesPublicly && "toggle-active"
                                                    )}
                                                >
                                                    <span className="toggle-thumb" />
                                                </button>
                                            </label>
                                            <label className="flex items-center justify-between p-4 rounded-xl bg-bg-hover cursor-pointer">
                                                <div>
                                                    <p className="font-medium text-white">Show WhatsApp button</p>
                                                    <p className="text-sm text-text-faint text-pretty">
                                                        Display WhatsApp contact button on profile
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => updateProfile({ showWhatsapp: !profile.showWhatsapp })}
                                                    role="switch"
                                                    aria-checked={profile.showWhatsapp}
                                                    className={cn(
                                                        "toggle",
                                                        profile.showWhatsapp && "toggle-active"
                                                    )}
                                                >
                                                    <span className="toggle-thumb" />
                                                </button>
                                            </label>
                                            <label className="flex items-center justify-between p-4 rounded-xl bg-bg-hover cursor-pointer">
                                                <div>
                                                    <p className="font-medium text-white">Show Telegram button</p>
                                                    <p className="text-sm text-text-faint text-pretty">
                                                        {profile.telegramConnected
                                                            ? "Display Telegram contact button on profile"
                                                            : "Connect Telegram first to enable this"}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        if (profile.telegramConnected) {
                                                            updateProfile({ showTelegram: !profile.showTelegram });
                                                        }
                                                    }}
                                                    disabled={!profile.telegramConnected}
                                                    role="switch"
                                                    aria-checked={profile.showTelegram && profile.telegramConnected}
                                                    className={cn(
                                                        "toggle",
                                                        profile.showTelegram && profile.telegramConnected && "toggle-active",
                                                        !profile.telegramConnected && "opacity-50 cursor-not-allowed"
                                                    )}
                                                >
                                                    <span className="toggle-thumb" />
                                                </button>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Share Links */}
                                    {profile.slug && (
                                        <div className="card p-6">
                                            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2 text-balance">
                                                <Link2 className="w-5 h-5 text-brand-blue" />
                                                Share Your Profile
                                            </h3>
                                            <div className="space-y-3">
                                                <ShareLinkRow label="Profile page" url={`ftfw.fit/${profile.slug}`} />
                                                <ShareLinkRow label="WhatsApp deep link" url={`ftfw.fit/${profile.slug}?c=wb`} />
                                                <ShareLinkRow label="Telegram deep link" url={`ftfw.fit/${profile.slug}?c=tg`} />
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Notifications Tab */}
                            {activeTab === "notifications" && (
                                <motion.div key="notifications" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="space-y-6">
                                    <div className="card p-6">
                                        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2 text-balance">
                                            <Bell className="w-5 h-5 text-brand-orange" />
                                            Notification Preferences
                                        </h3>
                                        <div className="space-y-4">
                                            <label className="flex items-center justify-between p-4 rounded-xl bg-bg-hover cursor-pointer group">
                                                <div>
                                                    <p className="font-medium text-white">Email Alerts</p>
                                                    <p className="text-sm text-text-faint text-pretty">
                                                        Receive alerts when clients miss check-ins
                                                    </p>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={profile.notifications.emailAlerts}
                                                    onChange={(e) =>
                                                        updateNotification("emailAlerts", e.target.checked)
                                                    }
                                                    className="toggle"
                                                />
                                            </label>

                                            <label className="flex items-center justify-between p-4 rounded-xl bg-bg-hover cursor-pointer group">
                                                <div>
                                                    <p className="font-medium text-white">SMS Reminders</p>
                                                    <p className="text-sm text-text-faint text-pretty">
                                                        Get text reminders for important events
                                                    </p>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={profile.notifications.smsReminders}
                                                    onChange={(e) =>
                                                        updateNotification("smsReminders", e.target.checked)
                                                    }
                                                    className="toggle"
                                                />
                                            </label>

                                            <label className="flex items-center justify-between p-4 rounded-xl bg-bg-hover cursor-pointer group">
                                                <div>
                                                    <p className="font-medium text-white">Weekly Digest</p>
                                                    <p className="text-sm text-text-faint text-pretty">
                                                        Summary of client progress every Sunday
                                                    </p>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={profile.notifications.weeklyDigest}
                                                    onChange={(e) =>
                                                        updateNotification("weeklyDigest", e.target.checked)
                                                    }
                                                    className="toggle"
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Integrations Tab */}
                            {activeTab === "integrations" && (
                                <motion.div key="integrations" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="space-y-6">
                                    <div className="card p-6">
                                        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2 text-balance">
                                            <Smartphone className="w-5 h-5 text-brand-green" />
                                            WhatsApp Business
                                        </h3>
                                        <div className="flex items-center justify-between p-4 rounded-xl bg-bg-hover">
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center",
                                                        profile.whatsappConnected
                                                            ? "bg-brand-green/10 text-brand-green"
                                                            : "bg-bg-card text-text-faint"
                                                    )}
                                                >
                                                    <MessageSquare className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white">
                                                        {profile.whatsappConnected
                                                            ? "Connected"
                                                            : "Not Connected"}
                                                    </p>
                                                    <p className="text-sm text-text-faint">
                                                        {profile.whatsappConnected
                                                            ? `Phone: +${waPhoneNumber || "..."}`
                                                            : "Connect to send workouts via WhatsApp"}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                className={cn(
                                                    profile.whatsappConnected
                                                        ? "btn-secondary"
                                                        : "btn-primary"
                                                )}
                                            >
                                                {profile.whatsappConnected ? "Manage" : "Connect"}
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {/* wa.me Link */}
                                        {waLink && (
                                            <div className="mt-4 p-4 rounded-xl bg-bg-hover">
                                                <p className="label-mono mb-2">Your WhatsApp Link</p>
                                                <div className="flex items-center gap-2">
                                                    <code className="flex-1 text-sm text-brand-green bg-bg-primary px-3 py-2 rounded-lg font-mono truncate">
                                                        {waLink}
                                                    </code>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(waLink);
                                                            setWaLinkCopied(true);
                                                            setTimeout(() => setWaLinkCopied(false), 2000);
                                                        }}
                                                        className="btn-secondary !px-3"
                                                        aria-label="Copy WhatsApp link"
                                                    >
                                                        {waLinkCopied ? (
                                                            <Check className="w-4 h-4 text-brand-green" />
                                                        ) : (
                                                            <Copy className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                                <p className="text-xs text-text-faint mt-2">
                                                    Share this link so leads can message you directly on WhatsApp.
                                                </p>
                                            </div>
                                        )}

                                        {profile.whatsappConnected && <WhatsAppRulesSection />}
                                    </div>

                                    <div className="card p-6">
                                        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                            <Send className="w-5 h-5 text-brand-blue" />
                                            Telegram Bot
                                        </h3>
                                        {profile.telegramConnected ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between p-4 rounded-xl bg-bg-hover">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-blue/10 text-brand-blue">
                                                            <Send className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-white">Connected</p>
                                                            <p className="text-sm text-text-faint">
                                                                @{profile.telegramBotUsername}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className="badge badge-green">Active</span>
                                                </div>
                                                {profile.telegramDeepLink && (
                                                    <div className="space-y-2">
                                                        <p className="text-sm text-text-secondary">
                                                            Share this link with your clients to connect them on Telegram:
                                                        </p>
                                                        <div className="flex gap-3">
                                                            <input
                                                                type="text"
                                                                value={profile.telegramDeepLink}
                                                                readOnly
                                                                className="input flex-1 text-xs"
                                                                aria-label="Telegram deep link"
                                                                name="telegramDeepLink"
                                                            />
                                                            <button
                                                                onClick={copyDeepLink}
                                                                className="btn-primary"
                                                            >
                                                                {linkCopied ? (
                                                                    <><Check className="w-4 h-4" /> Copied</>
                                                                ) : (
                                                                    "Copy"
                                                                )}
                                                            </button>
                                                        </div>
                                                        {!profile.name && (
                                                            <p className="text-xs text-brand-amber">
                                                                Set your name above to get a personalised invite link.
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-text-secondary">
                                                Telegram will be available once the platform bot is configured.
                                            </p>
                                        )}
                                    </div>

                                    <div className="card p-6">
                                        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                            <CreditCard className="w-5 h-5 text-brand-violet" />
                                            Stripe Connect
                                        </h3>
                                        <div className="flex items-center justify-between p-4 rounded-xl bg-bg-hover">
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center",
                                                        profile.stripeConnected
                                                            ? "bg-brand-violet/10 text-brand-violet"
                                                            : "bg-bg-card text-text-faint"
                                                    )}
                                                >
                                                    <CreditCard className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white">
                                                        {profile.stripeConnected
                                                            ? "Connected"
                                                            : "Not Connected"}
                                                    </p>
                                                    <p className="text-sm text-text-faint">
                                                        {profile.stripeConnected
                                                            ? "Accept payments from clients"
                                                            : "Connect to accept client payments"}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={profile.stripeConnected ? handleStripeDashboard : handleStripeConnect}
                                                disabled={stripeLoading}
                                                className={cn(
                                                    profile.stripeConnected
                                                        ? "btn-secondary"
                                                        : "btn-primary"
                                                )}
                                            >
                                                {stripeLoading ? "Connecting..." : profile.stripeConnected ? "Dashboard" : "Connect"}
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Short Links & QR Codes */}
                                    <div className="card p-6">
                                        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                            <Link2 className="w-5 h-5 text-brand-cyan" />
                                            Short Links & QR Codes
                                        </h3>
                                        {shortLinks.length === 0 ? (
                                            <p className="text-sm text-text-secondary">
                                                No short links yet. They&apos;ll be auto-generated when you create offers.
                                            </p>
                                        ) : (
                                            <div className="space-y-3">
                                                {shortLinks.map((link) => (
                                                    <div key={link.id} className="p-4 rounded-xl bg-bg-hover">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div>
                                                                <p className="text-sm font-medium text-white">
                                                                    {link.label || link.code}
                                                                </p>
                                                                <p className="text-xs text-text-faint font-mono truncate">
                                                                    {link.targetUrl}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="flex items-center gap-1 text-xs text-text-faint tabular-nums">
                                                                    <MousePointerClick className="w-3 h-3" />
                                                                    {link.clicks}
                                                                </span>
                                                                <button
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(link.shortUrl);
                                                                    }}
                                                                    className="btn-ghost !p-1.5"
                                                                    aria-label="Copy short link"
                                                                >
                                                                    <Copy className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => setShowQrId(showQrId === link.id ? null : link.id)}
                                                                    className="btn-ghost !p-1.5"
                                                                    aria-label="Show QR code"
                                                                >
                                                                    <QrCode className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <code className="text-xs text-brand-cyan bg-bg-primary px-2 py-1 rounded font-mono">
                                                            {link.shortUrl}
                                                        </code>

                                                        {showQrId === link.id && (
                                                            <div className="mt-4 flex flex-col items-center gap-3 p-4 rounded-xl bg-white">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img
                                                                    src={`${process.env.NEXT_PUBLIC_API_URL}/short-links/${link.id}/qr?size=200`}
                                                                    alt={`QR code for ${link.code}`}
                                                                    width={200}
                                                                    height={200}
                                                                />
                                                                <a
                                                                    href={`${process.env.NEXT_PUBLIC_API_URL}/short-links/${link.id}/qr?size=600`}
                                                                    download={`${link.code}-qr.png`}
                                                                    className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-black transition-colors"
                                                                >
                                                                    <Download className="w-3.5 h-3.5" />
                                                                    Download HD
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* Billing Tab */}
                            {activeTab === "billing" && (
                                <motion.div key="billing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="space-y-6">
                                    <div className="card p-6">
                                        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                            <CreditCard className="w-5 h-5 text-brand-cyan" />
                                            Current Plan
                                        </h3>
                                        <div className="p-6 rounded-xl bg-gradient-to-br from-brand-green/10 to-brand-cyan/10 border border-brand-green/20">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <p className="text-xs text-brand-green font-bold uppercase tracking-widest mb-1">
                                                        Pro Plan
                                                    </p>
                                                    <p className="text-3xl font-bold text-white">
                                                        ₦15,000
                                                        <span className="text-sm text-text-secondary font-normal">
                                                            /month
                                                        </span>
                                                    </p>
                                                </div>
                                                <span className="badge badge-green">Active</span>
                                            </div>
                                            <ul className="space-y-2 text-sm text-text-secondary mb-6">
                                                <li className="flex items-center gap-2">
                                                    <Check className="w-4 h-4 text-brand-green" />
                                                    Unlimited clients
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <Check className="w-4 h-4 text-brand-green" />
                                                    WhatsApp workout delivery
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <Check className="w-4 h-4 text-brand-green" />
                                                    Payment collection
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <Check className="w-4 h-4 text-brand-green" />
                                                    Analytics dashboard
                                                </li>
                                            </ul>
                                            <button className="btn-secondary w-full">
                                                Manage Subscription
                                            </button>
                                        </div>
                                    </div>

                                    <div className="card p-6">
                                        <h3 className="text-lg font-semibold text-white mb-4">
                                            Billing History
                                        </h3>
                                        <div className="text-center py-8">
                                            <p className="text-text-faint text-sm">
                                                No billing history available yet.
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}

export default function SettingsPage() {
    return (
        <Suspense>
            <SettingsContent />
        </Suspense>
    );
}
