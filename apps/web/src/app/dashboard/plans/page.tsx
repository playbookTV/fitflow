"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
    Plus,
    Search,
    Dumbbell,
    Calendar,
    Users,
    MoreHorizontal,
    Copy,
    Trash2,
    Edit3,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/auth";
import { motion } from "framer-motion";

interface WorkoutPlan {
    id: string;
    title: string;
    description?: string;
    daysPerWeek: number;
    createdAt: string;
    _count?: {
        assignments: number;
    };
}

const gridVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const cardVariants = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } } };

export default function PlansPage() {
    const [plans, setPlans] = useState<WorkoutPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/plans`, {
                    headers: await getAuthHeaders(),
                });
                if (response.ok) {
                    setPlans(await response.json());
                }
            } catch (error) {
                console.error("Failed to fetch plans:", error);
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
                `${process.env.NEXT_PUBLIC_API_URL}/plans/${planId}/duplicate`,
                {
                    method: "POST",
                    headers: await getAuthHeaders(),
                }
            );
            if (response.ok) {
                const newPlan = await response.json();
                setPlans((prev) => [newPlan, ...prev]);
            }
        } catch (error) {
            console.error("Failed to duplicate plan:", error);
        }
        setActiveMenu(null);
    };

    const handleDelete = async (planId: string) => {
        if (!confirm("Are you sure you want to delete this plan?")) return;

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/plans/${planId}`,
                {
                    method: "DELETE",
                    headers: await getAuthHeaders(),
                }
            );
            if (response.ok) {
                setPlans((prev) => prev.filter((p) => p.id !== planId));
            }
        } catch (error) {
            console.error("Failed to delete plan:", error);
        }
        setActiveMenu(null);
    };

    return (
        <DashboardLayout
            title="Workout Plans"
            subtitle="Manage your workout templates"
            actions={
                <Link href="/dashboard/plans/new" className="btn-primary">
                    <Plus className="w-4 h-4" />
                    NEW PLAN
                </Link>
            }
        >
            {/* Search */}
            <div className="mb-8">
                <div className="relative max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                    <input
                        type="text"
                        placeholder="Search plans\u2026"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-with-icon w-full"
                        aria-label="Search plans"
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
                        <Dumbbell className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1 text-balance">
                        {searchQuery ? "No plans found" : "No workout plans yet"}
                    </h3>
                    <p className="text-text-secondary text-sm mb-6 text-pretty">
                        {searchQuery
                            ? "Try a different search term"
                            : "Create your first workout plan template"}
                    </p>
                    {!searchQuery && (
                        <Link href="/dashboard/plans/new" className="btn-primary">
                            <Plus className="w-4 h-4" />
                            CREATE PLAN
                        </Link>
                    )}
                </div>
            ) : (
                <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" variants={gridVariants} initial="hidden" animate="visible">
                    {filteredPlans.map((plan) => (
                        <motion.div key={plan.id} variants={cardVariants}>
                        <div
                            className="card-interactive p-5 group relative"
                        >
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

                                {/* Dropdown menu */}
                                {activeMenu === plan.id && (
                                    <div className="dropdown right-0 top-full mt-1 min-w-[160px]">
                                        <Link
                                            href={`/dashboard/plans/${plan.id}`}
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

                            <Link href={`/dashboard/plans/${plan.id}`} className="block">
                                {/* Icon */}
                                <div className="w-12 h-12 rounded-xl bg-brand-violet/10 border border-brand-violet/20 flex items-center justify-center mb-4">
                                    <Dumbbell className="w-5 h-5 text-brand-violet" />
                                </div>

                                {/* Title */}
                                <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-brand-green transition-colors text-balance">
                                    {plan.title}
                                </h3>

                                {/* Description */}
                                {plan.description && (
                                    <p className="text-sm text-text-faint mb-4 line-clamp-2 text-pretty">
                                        {plan.description}
                                    </p>
                                )}

                                {/* Meta */}
                                <div className="flex items-center gap-4 text-xs text-text-faint">
                                    <span className="flex items-center gap-1 tabular-nums">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {plan.daysPerWeek} days/week
                                    </span>
                                    {plan._count?.assignments !== undefined && (
                                        <span className="flex items-center gap-1 tabular-nums">
                                            <Users className="w-3.5 h-3.5" />
                                            {plan._count.assignments} assigned
                                        </span>
                                    )}
                                </div>

                                {/* Created date */}
                                <p className="text-[10px] text-text-muted mt-3">
                                    Created {formatDate(plan.createdAt)}
                                </p>
                            </Link>
                        </div>
                        </motion.div>
                    ))}

                    {/* Create new card */}
                    <motion.div variants={cardVariants}>
                    <Link
                        href="/dashboard/plans/new"
                        className="flex flex-col items-center justify-center p-5 rounded-2xl border border-dashed border-border-hover bg-transparent hover:bg-bg-hover hover:border-brand-green/30 transition-[color,background-color,border-color] duration-200 group min-h-[200px]"
                    >
                        <div className="w-12 h-12 rounded-xl bg-bg-card border border-border flex items-center justify-center text-text-faint mb-3 group-hover:border-brand-green/30 group-hover:text-brand-green group-hover:scale-110 transition-[color,border-color,transform] duration-200">
                            <Plus className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-medium text-text-faint group-hover:text-text-secondary transition-colors">
                            Create New Plan
                        </p>
                    </Link>
                    </motion.div>
                </motion.div>
            )}
        </DashboardLayout>
    );
}
