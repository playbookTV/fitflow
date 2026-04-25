"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui";
import {
    LayoutDashboard,
    Users,
    DollarSign,
    Activity,
    ArrowLeft,
    LogOut,
    ChevronLeft,
    Menu,
    Shield,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AdminGuard } from "./AdminGuard";

interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
}

const navItems: NavItem[] = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/coaches", label: "Coaches", icon: Users },
    { href: "/admin/revenue", label: "Revenue", icon: DollarSign },
    { href: "/admin/activity", label: "Activity", icon: Activity },
];

interface AdminLayoutProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
}

export function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
    const pathname = usePathname();
    const [supabase] = useState(() => createClient());
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        if (href === "/admin") {
            return pathname === "/admin";
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
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 group",
                    isActive
                        ? "bg-brand-orange/10 text-brand-orange"
                        : "text-text-faint hover:text-white hover:bg-white/5"
                )}
                onClick={() => setMobileMenuOpen(false)}
            >
                <Icon
                    aria-hidden="true"
                    className={cn(
                        "w-5 h-5 shrink-0",
                        isActive ? "text-brand-orange" : "text-text-faint group-hover:text-white"
                    )}
                />
                {!sidebarCollapsed && (
                    <span className="text-sm font-medium">{item.label}</span>
                )}
            </Link>
        );
    };

    return (
        <AdminGuard>
            <div className="min-h-dvh bg-mesh-gradient flex">
                {/* Mobile menu overlay */}
                {mobileMenuOpen && (
                    <button
                        className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                        onClick={() => setMobileMenuOpen(false)}
                        aria-label="Close menu"
                    />
                )}

                {/* Sidebar */}
                <aside
                    className={cn(
                        "fixed lg:sticky top-0 left-0 z-50 h-dvh bg-bg-primary border-r border-border flex flex-col transition-[transform] duration-300",
                        sidebarCollapsed ? "w-[72px]" : "w-64",
                        mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                    )}
                >
                    {/* Sidebar Header */}
                    <div
                        className={cn(
                            "h-16 flex items-center border-b border-border shrink-0",
                            sidebarCollapsed ? "px-4 justify-center" : "px-5 justify-between"
                        )}
                    >
                        <Link href="/admin" className="flex items-center gap-2">
                            <Logo size="sm" />
                            {!sidebarCollapsed && (
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white">FitFlow</span>
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-brand-orange/20 text-brand-orange rounded-md uppercase tracking-wider">
                                        Admin
                                    </span>
                                </div>
                            )}
                        </Link>
                        {!sidebarCollapsed && (
                            <button
                                onClick={() => setSidebarCollapsed(true)}
                                className="p-1.5 rounded-lg text-text-faint hover:text-white hover:bg-white/5 transition-colors hidden lg:flex"
                                aria-label="Collapse sidebar"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                        {navItems.map((item) => (
                            <NavLink key={item.href} item={item} />
                        ))}
                    </nav>

                    {/* Bottom Navigation */}
                    <div className="border-t border-border py-4 px-3 space-y-1">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 text-text-faint hover:text-white hover:bg-white/5 group"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <ArrowLeft
                                aria-hidden="true"
                                className="w-5 h-5 shrink-0 text-text-faint group-hover:text-white"
                            />
                            {!sidebarCollapsed && (
                                <span className="text-sm font-medium">Back to Dashboard</span>
                            )}
                        </Link>
                        <button
                            onClick={handleLogout}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 w-full",
                                "text-text-faint hover:text-brand-red hover:bg-brand-red/5"
                            )}
                        >
                            <LogOut aria-hidden="true" className="w-5 h-5 shrink-0" />
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
                                aria-label="Expand sidebar"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </aside>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-h-dvh">
                    {/* Top Header */}
                    <header className="sticky top-0 z-30 h-16 bg-bg-primary/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-6 shrink-0">
                        <div className="flex items-center gap-4">
                            {/* Mobile menu toggle */}
                            <button
                                onClick={() => setMobileMenuOpen(true)}
                                className="p-2 rounded-xl text-text-faint hover:text-white hover:bg-white/5 transition-colors lg:hidden"
                                aria-label="Open menu"
                            >
                                <Menu className="w-5 h-5" />
                            </button>

                            {/* Page title */}
                            {title && (
                                <div>
                                    <h1
                                        className="text-xl font-bold text-white tracking-tight"
                                        style={{ letterSpacing: "-0.02em" }}
                                    >
                                        {title}
                                    </h1>
                                    {subtitle && (
                                        <p className="text-xs text-text-faint mt-0.5">{subtitle}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-orange to-brand-red flex items-center justify-center text-white transition-shadow">
                                <Shield className="w-4 h-4" />
                            </div>
                        </div>
                    </header>

                    {/* Page Content */}
                    <main id="main-content" className="flex-1 p-6">
                        {children}
                    </main>
                </div>
            </div>
        </AdminGuard>
    );
}
