"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TrainerProfile {
    id: string;
    name: string;
    email: string;
    phone: string;
    businessName?: string;
    timezone: string;
    notifications: {
        emailAlerts: boolean;
        smsReminders: boolean;
        weeklyDigest: boolean;
    };
    stripeConnected: boolean;
    whatsappConnected: boolean;
}

type TabId = "profile" | "notifications" | "integrations" | "billing";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: "Profile", icon: User },
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

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<TabId>("profile");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [profile, setProfile] = useState<TrainerProfile>({
        id: "",
        name: "",
        email: "",
        phone: "",
        businessName: "",
        timezone: "Africa/Lagos",
        notifications: {
            emailAlerts: true,
            smsReminders: false,
            weeklyDigest: true,
        },
        stripeConnected: false,
        whatsappConnected: false,
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/trainers/me`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
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
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/trainers/me`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        name: profile.name,
                        phone: profile.phone,
                        businessName: profile.businessName,
                        timezone: profile.timezone,
                        notifications: profile.notifications,
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

    const updateProfile = (updates: Partial<TrainerProfile>) => {
        setProfile((prev) => ({ ...prev, ...updates }));
    };

    const updateNotification = (key: keyof TrainerProfile["notifications"], value: boolean) => {
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
                                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left",
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
                        <>
                            {/* Profile Tab */}
                            {activeTab === "profile" && (
                                <div className="space-y-8 animate-fade-in">
                                    <div className="card p-6">
                                        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                            <User className="w-5 h-5 text-brand-blue" />
                                            Personal Information
                                        </h3>
                                        <div className="space-y-5">
                                            <div className="form-field">
                                                <label className="label">Full Name</label>
                                                <input
                                                    type="text"
                                                    value={profile.name}
                                                    onChange={(e) =>
                                                        updateProfile({ name: e.target.value })
                                                    }
                                                    className="input"
                                                    placeholder="Your full name"
                                                />
                                            </div>
                                            <div className="form-field">
                                                <label className="label">Email Address</label>
                                                <input
                                                    type="email"
                                                    value={profile.email}
                                                    disabled
                                                    className="input opacity-60 cursor-not-allowed"
                                                />
                                                <p className="text-xs text-text-faint mt-1">
                                                    Contact support to change your email
                                                </p>
                                            </div>
                                            <div className="form-field">
                                                <label className="label">Phone Number</label>
                                                <input
                                                    type="tel"
                                                    value={profile.phone}
                                                    onChange={(e) =>
                                                        updateProfile({ phone: e.target.value })
                                                    }
                                                    className="input"
                                                    placeholder="+234 XXX XXX XXXX"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card p-6">
                                        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                            <Building2 className="w-5 h-5 text-brand-violet" />
                                            Business Details
                                        </h3>
                                        <div className="space-y-5">
                                            <div className="form-field">
                                                <label className="label">Business Name</label>
                                                <input
                                                    type="text"
                                                    value={profile.businessName || ""}
                                                    onChange={(e) =>
                                                        updateProfile({ businessName: e.target.value })
                                                    }
                                                    className="input"
                                                    placeholder="Your fitness business name"
                                                />
                                            </div>
                                            <div className="form-field">
                                                <label className="label flex items-center gap-2">
                                                    <Globe className="w-3.5 h-3.5" />
                                                    Timezone
                                                </label>
                                                <select
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
                                                <p className="text-xs text-text-faint mt-1">
                                                    Used for scheduling workout deliveries
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Notifications Tab */}
                            {activeTab === "notifications" && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="card p-6">
                                        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                            <Bell className="w-5 h-5 text-brand-orange" />
                                            Notification Preferences
                                        </h3>
                                        <div className="space-y-4">
                                            <label className="flex items-center justify-between p-4 rounded-xl bg-bg-hover cursor-pointer group">
                                                <div>
                                                    <p className="font-medium text-white">Email Alerts</p>
                                                    <p className="text-sm text-text-faint">
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
                                                    <p className="text-sm text-text-faint">
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
                                                    <p className="text-sm text-text-faint">
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
                                </div>
                            )}

                            {/* Integrations Tab */}
                            {activeTab === "integrations" && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="card p-6">
                                        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
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
                                                            ? "Your WhatsApp Business is linked"
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
                                                className={cn(
                                                    profile.stripeConnected
                                                        ? "btn-secondary"
                                                        : "btn-primary"
                                                )}
                                            >
                                                {profile.stripeConnected ? "Dashboard" : "Connect"}
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Billing Tab */}
                            {activeTab === "billing" && (
                                <div className="space-y-6 animate-fade-in">
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
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
