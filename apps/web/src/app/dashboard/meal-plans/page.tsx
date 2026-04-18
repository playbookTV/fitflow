"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
    Plus,
    Search,
    UtensilsCrossed,
    Calendar,
    Users,
    MoreHorizontal,
    Copy,
    Trash2,
    Edit3,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/auth";

interface MealPlan {
    id: string;
    title: string;
    description?: string;
    daysPerWeek: number;
    createdAt: string;
    _count?: {
        assignments: number;
    };
}

export default function MealPlansPage() {
    const [plans, setPlans] = useState<MealPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/meal-plans`, {
                    headers: await getAuthHeaders(),
                });
                if (response.ok) {
                    setPlans(await response.json());
                }
            } catch (error) {
                console.error("Failed to fetch meal plans:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPlans();
    }, []);

    const filteredPlans = plans.filter((plan) =>
        plan.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDuplicate = async (planId: string) => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/meal-plans/${planId}/duplicate`,
                { method: "POST", headers: await getAuthHeaders() }
            );
            if (response.ok) {
                const newPlan = await response.json();
                setPlans((prev) => [newPlan, ...prev]);
            }
        } catch (error) {
            console.error("Failed to duplicate meal plan:", error);
        }
        setActiveMenu(null);
    };

    const handleDelete = async (planId: string) => {
        if (!confirm("Are you sure you want to delete this meal plan?")) return;

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/meal-plans/${planId}`,
                { method: "DELETE", headers: await getAuthHeaders() }
            );
            if (response.ok) {
                setPlans((prev) => prev.filter((p) => p.id !== planId));
            }
        } catch (error) {
            console.error("Failed to delete meal plan:", error);
        }
        setActiveMenu(null);
    };

    return (
        <DashboardLayout
            title="Meal Plans"
            subtitle="Manage your nutrition templates"
            actions={
                <Link href="/dashboard/meal-plans/new" className="btn-primary">
                    <Plus className="w-4 h-4" />
                    NEW MEAL PLAN
                </Link>
            }
        >
            {/* Search */}
            <div className="mb-8">
                <div className="relative max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                    <input
                        type="text"
                        placeholder="Search meal plans\u2026"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-with-icon w-full"
                        aria-label="Search meal plans"
                        name="search"
                        autoComplete="off"
                    />
                </div>
            </div>

            {/* Plans Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="skeleton h-48 rounded-2xl" />
                    ))}
                </div>
            ) : filteredPlans.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <UtensilsCrossed className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">
                        {searchQuery ? "No meal plans found" : "No meal plans yet"}
                    </h3>
                    <p className="text-text-secondary text-sm mb-6">
                        {searchQuery
                            ? "Try a different search term"
                            : "Create your first meal plan template"}
                    </p>
                    {!searchQuery && (
                        <Link href="/dashboard/meal-plans/new" className="btn-primary">
                            <Plus className="w-4 h-4" />
                            CREATE MEAL PLAN
                        </Link>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPlans.map((plan) => (
                        <div key={plan.id} className="card-interactive p-5 group relative">
                            {/* Menu button */}
                            <div className="absolute top-4 right-4">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setActiveMenu(activeMenu === plan.id ? null : plan.id);
                                    }}
                                    className="btn-icon !p-2 !rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label="More options"
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>

                                {activeMenu === plan.id && (
                                    <div className="dropdown right-0 top-full mt-1 min-w-[160px]">
                                        <Link
                                            href={`/dashboard/meal-plans/${plan.id}`}
                                            className="dropdown-item flex items-center gap-2"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                            Edit Plan
                                        </Link>
                                        <button
                                            onClick={() => handleDuplicate(plan.id)}
                                            className="dropdown-item flex items-center gap-2 w-full text-left"
                                        >
                                            <Copy className="w-4 h-4" />
                                            Duplicate
                                        </button>
                                        <button
                                            onClick={() => handleDelete(plan.id)}
                                            className="dropdown-item flex items-center gap-2 w-full text-left text-brand-red hover:!text-brand-red"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>

                            <Link href={`/dashboard/meal-plans/${plan.id}`} className="block">
                                <div className="w-12 h-12 rounded-xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center mb-4">
                                    <UtensilsCrossed className="w-5 h-5 text-brand-orange" />
                                </div>

                                <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-brand-green transition-colors">
                                    {plan.title}
                                </h3>

                                {plan.description && (
                                    <p className="text-sm text-text-faint mb-4 line-clamp-2">
                                        {plan.description}
                                    </p>
                                )}

                                <div className="flex items-center gap-4 text-xs text-text-faint">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {plan.daysPerWeek} days/week
                                    </span>
                                    {plan._count?.assignments !== undefined && (
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3.5 h-3.5" />
                                            {plan._count.assignments} assigned
                                        </span>
                                    )}
                                </div>

                                <p className="text-[10px] text-text-muted mt-3">
                                    Created {formatDate(plan.createdAt)}
                                </p>
                            </Link>
                        </div>
                    ))}

                    <Link
                        href="/dashboard/meal-plans/new"
                        className="flex flex-col items-center justify-center p-5 rounded-2xl border border-dashed border-border-hover bg-transparent hover:bg-bg-hover hover:border-brand-green/30 transition-[color,background-color,border-color] duration-200 group min-h-[200px]"
                    >
                        <div className="w-12 h-12 rounded-xl bg-bg-card border border-border flex items-center justify-center text-text-faint mb-3 group-hover:border-brand-green/30 group-hover:text-brand-green group-hover:scale-110 transition-[color,border-color,transform] duration-200">
                            <Plus className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-medium text-text-faint group-hover:text-text-secondary transition-colors">
                            Create New Meal Plan
                        </p>
                    </Link>
                </div>
            )}
        </DashboardLayout>
    );
}
