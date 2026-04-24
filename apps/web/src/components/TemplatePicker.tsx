"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Dumbbell, Calendar, Loader2, Zap, ArrowRight, FileEdit,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { motion } from "framer-motion";

interface TemplateExercise {
    id: string;
    exerciseId: string;
    exercise: { id: string; name: string; category: string; muscles: string[] };
    sets: number;
    reps: string | null;
    rest: string | null;
    notes: string | null;
}

interface TemplateDay {
    id: string;
    dayNumber: number;
    title: string | null;
    exercises: TemplateExercise[];
}

interface Template {
    id: string;
    title: string;
    description: string | null;
    tags: string[];
    daysPerWeek: number;
    totalExercises: number;
    days: TemplateDay[];
}

const TAG_LABELS: Record<string, string> = {
    "full-body": "Full Body",
    "beginner": "Beginner",
    "general-fitness": "General Fitness",
    "ppl": "PPL",
    "hypertrophy": "Hypertrophy",
    "intermediate": "Intermediate",
    "upper-lower": "Upper / Lower",
    "strength": "Strength",
    "compound": "Compound",
    "fat-loss": "Fat Loss",
    "weight-loss": "Weight Loss",
    "circuit": "Circuit",
    "bodyweight": "Bodyweight",
    "home": "Home",
};

const FILTER_TAGS = [
    "strength",
    "hypertrophy",
    "fat-loss",
    "beginner",
    "full-body",
    "bodyweight",
];

const gridVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const cardVariants = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } } };

interface TemplatePickerProps {
    onStartFromScratch: () => void;
}

export default function TemplatePicker({ onStartFromScratch }: TemplatePickerProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [usingTemplateId, setUsingTemplateId] = useState<string | null>(null);

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const url = activeTag
                    ? `${process.env.NEXT_PUBLIC_API_URL}/plans/templates?tags=${activeTag}`
                    : `${process.env.NEXT_PUBLIC_API_URL}/plans/templates`;
                const response = await fetch(url, {
                    headers: await getAuthHeaders(),
                });
                if (response.ok) {
                    setTemplates(await response.json());
                }
            } catch (error) {
                console.error("Failed to fetch templates:", error);
            } finally {
                setLoading(false);
            }
        };
        setLoading(true);
        fetchTemplates();
    }, [activeTag]);

    const handleUseTemplate = async (templateId: string) => {
        setUsingTemplateId(templateId);
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/plans/templates/${templateId}/use`,
                {
                    method: "POST",
                    headers: await getAuthHeaders(),
                }
            );

            if (!response.ok) {
                const data = await response.json();
                toast({ variant: "error", title: data.error || "Failed to use template" });
                return;
            }

            const newPlan = await response.json();
            toast({ variant: "success", title: "Template loaded — customize it and save!" });
            router.push(`/dashboard/plans/${newPlan.id}`);
        } catch (error) {
            console.error("Failed to use template:", error);
            toast({ variant: "error", title: "Something went wrong" });
        } finally {
            setUsingTemplateId(null);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-white mb-1">Choose a starting point</h2>
                <p className="text-sm text-text-secondary">
                    Pick a template and customize it, or start from scratch.
                </p>
            </div>

            {/* Tag filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                    onClick={() => setActiveTag(null)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        activeTag === null
                            ? "bg-brand-green text-black"
                            : "bg-bg-card border border-border text-text-secondary hover:border-border-hover"
                    }`}
                >
                    All
                </button>
                {FILTER_TAGS.map((tag) => (
                    <button
                        key={tag}
                        onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            activeTag === tag
                                ? "bg-brand-green text-black"
                                : "bg-bg-card border border-border text-text-secondary hover:border-border-hover"
                        }`}
                    >
                        {TAG_LABELS[tag] || tag}
                    </button>
                ))}
            </div>

            {/* Template grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="skeleton h-56 rounded-2xl" />
                    ))}
                </div>
            ) : templates.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <Dumbbell className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">No templates found</h3>
                    <p className="text-text-secondary text-sm">
                        Try a different filter or start from scratch.
                    </p>
                </div>
            ) : (
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    variants={gridVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {templates.map((template) => (
                        <motion.div key={template.id} variants={cardVariants}>
                            <div className="card p-5 flex flex-col h-full">
                                {/* Icon + title */}
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-brand-violet/10 border border-brand-violet/20 flex items-center justify-center shrink-0">
                                        <Dumbbell className="w-4 h-4 text-brand-violet" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base font-semibold text-white leading-tight">
                                            {template.title}
                                        </h3>
                                        {template.description && (
                                            <p className="text-sm text-text-faint mt-1 line-clamp-2 text-pretty">
                                                {template.description}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Tags */}
                                <div className="flex flex-wrap gap-1.5 mb-4">
                                    {template.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="px-2 py-0.5 rounded-md bg-bg-elevated text-[11px] font-medium text-text-secondary border border-border"
                                        >
                                            {TAG_LABELS[tag] || tag}
                                        </span>
                                    ))}
                                </div>

                                {/* Meta */}
                                <div className="flex items-center gap-4 text-xs text-text-faint mb-4">
                                    <span className="flex items-center gap-1 tabular-nums">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {template.daysPerWeek} days
                                    </span>
                                    <span className="flex items-center gap-1 tabular-nums">
                                        <Zap className="w-3.5 h-3.5" />
                                        {template.totalExercises} exercises
                                    </span>
                                </div>

                                {/* Use button */}
                                <button
                                    onClick={() => handleUseTemplate(template.id)}
                                    disabled={usingTemplateId !== null}
                                    className="btn-primary w-full mt-auto justify-center"
                                >
                                    {usingTemplateId === template.id ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Loading...
                                        </>
                                    ) : (
                                        <>
                                            Use Template
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {/* Start from scratch */}
            <div className="flex justify-center pt-2">
                <button
                    onClick={onStartFromScratch}
                    className="btn-secondary gap-2"
                >
                    <FileEdit className="w-4 h-4" />
                    Start from scratch
                </button>
            </div>
        </div>
    );
}
