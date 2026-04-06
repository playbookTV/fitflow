"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { syncAuthToken } from "@/lib/auth";
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
} from "lucide-react";
import { useEffect, useState } from "react";

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
    { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
    { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
    { href: "/dashboard/activity", label: "Activity", icon: Activity },
];

const bottomNavItems: NavItem[] = [
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

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

    useEffect(() => {
        syncAuthToken();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(() => {
            void syncAuthToken();
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem("token");
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
                        <button className="btn-icon relative">
                            <Bell className="w-4 h-4" />
                            {notifications > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-red rounded-full text-[10px] font-bold flex items-center justify-center">
                                    {notifications > 9 ? "9+" : notifications}
                                </span>
                            )}
                        </button>
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
