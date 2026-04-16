"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn, formatRelative } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui";
import {
    LayoutDashboard,
    Users,
    Dumbbell,
    MessageSquare,
    CreditCard,
    Settings,
    Bell,
    LogOut,
    ChevronLeft,
    Menu,
    Link2,
    UserPlus,
    Activity,
    UtensilsCrossed,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { getAuthHeaders } from "@/lib/auth";

interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    badge?: number;
}

const mainNavItems: NavItem[] = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/clients", label: "Clients", icon: Users },
    { href: "/dashboard/leads", label: "Leads", icon: UserPlus },
    { href: "/dashboard/offers", label: "Offers", icon: Link2 },
    { href: "/dashboard/plans", label: "Plans", icon: Dumbbell },
    { href: "/dashboard/meal-plans", label: "Meals", icon: UtensilsCrossed },
    { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
    { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
    { href: "/dashboard/activity", label: "Activity", icon: Activity },
];

const bottomNavItems: NavItem[] = [
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface NotificationEvent {
    id: string;
    eventType: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}

const NOTIF_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    "lead.created": { label: "New Lead", icon: UserPlus, color: "text-brand-orange" },
    "client.created": { label: "Client Created", icon: Users, color: "text-brand-blue" },
    "client.activated": { label: "Client Activated", icon: Activity, color: "text-brand-green" },
    "payment.confirmed": { label: "Payment Confirmed", icon: CreditCard, color: "text-brand-green" },
    "payment.bank_transfer_confirmed": { label: "Bank Transfer Confirmed", icon: CreditCard, color: "text-brand-violet" },
    "plan.assigned": { label: "Plan Assigned", icon: Dumbbell, color: "text-brand-blue" },
    "checkin.completed": { label: "Check-in Completed", icon: Activity, color: "text-brand-green" },
    "workout.completed": { label: "Workout Completed", icon: Activity, color: "text-brand-green" },
};

const getNotifConfig = (eventType: string) =>
    NOTIF_CONFIG[eventType] || { label: eventType, icon: Activity, color: "text-text-secondary" };

interface DashboardLayoutProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    actions?: React.ReactNode;
    notifications?: number;
}

export function DashboardLayout({
    children,
    title,
    subtitle,
    actions,
    notifications = 0,
}: DashboardLayoutProps) {
    const pathname = usePathname();
    const [supabase] = useState(() => createClient());
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifEvents, setNotifEvents] = useState<NotificationEvent[]>([]);
    const [notifLoading, setNotifLoading] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        setNotifLoading(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/analytics/events?limit=8`,
                { headers: await getAuthHeaders() }
            );
            if (res.ok) setNotifEvents(await res.json());
        } catch {
            // silently fail — bell still shows count from prop
        } finally {
            setNotifLoading(false);
        }
    }, []);

    // Close flyout on outside click
    useEffect(() => {
        if (!notifOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setNotifOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [notifOpen]);

    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_OUT") {
                window.location.href = "/login";
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
    };

    const isActiveRoute = (href: string) => {
        if (href === "/dashboard") {
            return pathname === "/dashboard";
        }
        return pathname.startsWith(href);
    };

    const NavLink = ({ item }: { item: NavItem }) => {
        const isActive = isActiveRoute(item.href);
        const Icon = item.icon;

        return (
            <Link
                href={item.href}
                className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                    isActive
                        ? "bg-brand-green/10 text-brand-green"
                        : "text-text-faint hover:text-white hover:bg-white/5"
                )}
                onClick={() => setMobileMenuOpen(false)}
            >
                <Icon className={cn(
                    "w-5 h-5 shrink-0",
                    isActive ? "text-brand-green" : "text-text-faint group-hover:text-white"
                )} />
                {!sidebarCollapsed && (
                    <span className="text-sm font-medium">{item.label}</span>
                )}
                {!sidebarCollapsed && item.badge && item.badge > 0 && (
                    <span className="ml-auto px-2 py-0.5 text-[10px] font-bold bg-brand-red rounded-full">
                        {item.badge}
                    </span>
                )}
            </Link>
        );
    };

    return (
        <div className="min-h-screen bg-mesh-gradient flex">
            {/* Mobile menu overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed lg:sticky top-0 left-0 z-50 h-screen bg-bg-primary border-r border-border flex flex-col transition-all duration-300",
                    sidebarCollapsed ? "w-[72px]" : "w-64",
                    mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Sidebar Header */}
                <div className={cn(
                    "h-16 flex items-center border-b border-border shrink-0",
                    sidebarCollapsed ? "px-4 justify-center" : "px-5 justify-between"
                )}>
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <Logo size="sm" />
                        {!sidebarCollapsed && (
                            <span className="font-bold text-white">FitFlow</span>
                        )}
                    </Link>
                    {!sidebarCollapsed && (
                        <button
                            onClick={() => setSidebarCollapsed(true)}
                            className="p-1.5 rounded-lg text-text-faint hover:text-white hover:bg-white/5 transition-colors hidden lg:flex"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {mainNavItems.map((item) => (
                        <NavLink key={item.href} item={item} />
                    ))}
                </nav>

                {/* Bottom Navigation */}
                <div className="border-t border-border py-4 px-3 space-y-1">
                    {bottomNavItems.map((item) => (
                        <NavLink key={item.href} item={item} />
                    ))}
                    <button
                        onClick={handleLogout}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 w-full",
                            "text-text-faint hover:text-brand-red hover:bg-brand-red/5"
                        )}
                    >
                        <LogOut className="w-5 h-5 shrink-0" />
                        {!sidebarCollapsed && (
                            <span className="text-sm font-medium">Log out</span>
                        )}
                    </button>
                </div>

                {/* Expand button (when collapsed) */}
                {sidebarCollapsed && (
                    <div className="border-t border-border py-4 px-3">
                        <button
                            onClick={() => setSidebarCollapsed(false)}
                            className="p-2.5 rounded-xl text-text-faint hover:text-white hover:bg-white/5 transition-colors w-full flex justify-center"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen">
                {/* Top Header */}
                <header className="sticky top-0 z-30 h-16 bg-bg-primary/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-4">
                        {/* Mobile menu toggle */}
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="p-2 rounded-xl text-text-faint hover:text-white hover:bg-white/5 transition-colors lg:hidden"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        {/* Page title */}
                        {title && (
                            <div>
                                <h1 className="text-lg font-bold text-white">{title}</h1>
                                {subtitle && (
                                    <p className="text-xs text-text-faint">{subtitle}</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {actions}
                        <div className="relative" ref={notifRef}>
                            <button
                                className="btn-icon relative"
                                onClick={() => {
                                    const opening = !notifOpen;
                                    setNotifOpen(opening);
                                    if (opening) fetchNotifications();
                                }}
                            >
                                <Bell className="w-4 h-4" />
                                {notifications > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-red rounded-full text-[10px] font-bold flex items-center justify-center">
                                        {notifications > 9 ? "9+" : notifications}
                                    </span>
                                )}
                            </button>

                            {notifOpen && (
                                <div className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-bg-secondary border border-border rounded-2xl shadow-xl overflow-hidden z-50">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                                        <h3 className="text-sm font-semibold text-white">Notifications</h3>
                                        <Link
                                            href="/dashboard/activity"
                                            className="text-xs text-brand-green hover:underline"
                                            onClick={() => setNotifOpen(false)}
                                        >
                                            View all
                                        </Link>
                                    </div>
                                    <div className="overflow-y-auto max-h-80">
                                        {notifLoading ? (
                                            <div className="flex items-center justify-center py-8 text-text-faint text-sm">
                                                Loading...
                                            </div>
                                        ) : notifEvents.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-8 text-text-faint">
                                                <Bell className="w-6 h-6 mb-2 opacity-40" />
                                                <span className="text-sm">No recent activity</span>
                                            </div>
                                        ) : (
                                            notifEvents.map((evt) => {
                                                const config = getNotifConfig(evt.eventType);
                                                const Icon = config.icon;
                                                const clientName = (evt.metadata?.clientName as string) || (evt.metadata?.name as string) || "";
                                                return (
                                                    <div
                                                        key={evt.id}
                                                        className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-border/50 last:border-0"
                                                    >
                                                        <div className={cn("mt-0.5 p-1.5 rounded-lg bg-white/5", config.color)}>
                                                            <Icon className="w-3.5 h-3.5" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-white truncate">
                                                                {config.label}
                                                                {clientName && (
                                                                    <span className="text-text-secondary"> — {clientName}</span>
                                                                )}
                                                            </p>
                                                            <p className="text-xs text-text-faint mt-0.5">
                                                                {formatRelative(evt.createdAt)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-violet to-brand-blue flex items-center justify-center text-white font-bold text-sm cursor-pointer hover:shadow-glow-violet transition-shadow">
                            T
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
