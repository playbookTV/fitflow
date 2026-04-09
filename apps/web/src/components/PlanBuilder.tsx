"use client";

import { useState, useEffect } from "react";
import {
    Plus, Search, GripVertical, Save, Trash2, ChevronDown, ChevronRight
} from "lucide-react";
import Image from "next/image";

interface UnifiedResult {
    id: string;
    name: string;
    category: string;
    muscles: string[];
    thumbnailUrl?: string;
    source: "local" | "ymove";
    ymoveId?: string;
}

interface PlanExercise {
    id: string;
    exerciseId: string;
    name: string;
    sets: number;
    reps: string;
    rest: string;
    notes: string;
    demoVideoUrl?: string;
}

interface PlanDay {
    id: string;
    dayNumber: number;
    title: string;
    exercises: PlanExercise[];
    isOpen: boolean;
}

interface PlanBuilderProps {
    planId?: string;
}

export default function PlanBuilder({ planId }: PlanBuilderProps) {
    const [title, setTitle] = useState("New Workout Plan");
    const [description, setDescription] = useState("");
    const [days, setDays] = useState<PlanDay[]>([
        { id: crypto.randomUUID(), dayNumber: 1, title: "Day 1", exercises: [], isOpen: true }
    ]);
    const [searchTerm, setSearchTerm] = useState("");
    const [unifiedResults, setUnifiedResults] = useState<UnifiedResult[]>([]);
    const [activeDayIdx, setActiveDayIdx] = useState<number | null>(0);
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(!!planId);

    // Load existing plan data when editing
    useEffect(() => {
        if (!planId) return;

        const token = localStorage.getItem("token");
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/plans/${planId}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Plan not found");
                return res.json();
            })
            .then((plan) => {
                setTitle(plan.title);
                setDescription(plan.description || "");
                setDays(
                    plan.days.map((day: { id: string; dayNumber: number; title: string; exercises: { id: string; exerciseId: string; exercise?: { name?: string; demoVideoUrl?: string }; sets: number; reps: string; rest: string; notes?: string }[] }) => ({
                        id: day.id,
                        dayNumber: day.dayNumber,
                        title: day.title,
                        isOpen: true,
                        exercises: day.exercises.map((we: { id: string; exerciseId: string; exercise?: { name?: string; demoVideoUrl?: string }; sets: number; reps: string; rest: string; notes?: string }) => ({
                            id: we.id,
                            exerciseId: we.exerciseId,
                            name: we.exercise?.name || "Unknown",
                            sets: we.sets,
                            reps: we.reps,
                            rest: we.rest,
                            notes: we.notes || "",
                            demoVideoUrl: we.exercise?.demoVideoUrl,
                        })),
                    }))
                );
            })
            .catch((err) => console.error("Failed to load plan:", err))
            .finally(() => setLoading(false));
    }, [planId]);

    useEffect(() => {
        if (searchTerm.length < 3) {
            setUnifiedResults([]);
            return;
        }

        const controller = new AbortController();
        const token = localStorage.getItem("token");

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/exercises/unified-search?q=${encodeURIComponent(searchTerm)}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
        })
            .then((res) => res.ok ? res.json() : { results: [] })
            .then((data: { results: UnifiedResult[] }) => setUnifiedResults(data.results))
            .catch((err) => {
                if (err.name !== "AbortError") setUnifiedResults([]);
            });

        return () => controller.abort();
    }, [searchTerm]);

    const addDay = () => {
        setDays([...days, {
            id: crypto.randomUUID(),
            dayNumber: days.length + 1,
            title: `Day ${days.length + 1}`,
            exercises: [],
            isOpen: true
        }]);
    };

    const addExerciseToDay = (dayIdx: number, exerciseId: string, name: string, thumbnailUrl?: string) => {
        const newDays = [...days];
        newDays[dayIdx].exercises.push({
            id: crypto.randomUUID(),
            exerciseId,
            name,
            sets: 3,
            reps: "10-12",
            rest: "60s",
            notes: "",
            demoVideoUrl: thumbnailUrl,
        });
        setDays(newDays);
        setSearchTerm("");
    };

    const handleResultClick = async (dayIdx: number, result: UnifiedResult) => {
        if (result.source === "local") {
            addExerciseToDay(dayIdx, result.id, result.name, result.thumbnailUrl);
            return;
        }

        // YMove: import first, then add
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/exercises/ymove-import`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ymoveId: result.ymoveId }),
            });
            if (!res.ok) throw new Error("Import failed");
            const imported = await res.json();
            addExerciseToDay(dayIdx, imported.id, imported.name, result.thumbnailUrl || imported.demoVideoUrl);
        } catch (err) {
            console.error("Failed to import YMove exercise:", err);
        }
    };

    const removeExercise = (dayIdx: number, exIdx: number) => {
        const newDays = [...days];
        newDays[dayIdx].exercises.splice(exIdx, 1);
        setDays(newDays);
    };

    const toggleDay = (idx: number) => {
        const newDays = [...days];
        newDays[idx].isOpen = !newDays[idx].isOpen;
        setDays(newDays);
    };

    const savePlan = async () => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem("token");
            const url = planId
                ? `${process.env.NEXT_PUBLIC_API_URL}/plans/${planId}`
                : `${process.env.NEXT_PUBLIC_API_URL}/plans`;
            const response = await fetch(url, {
                method: planId ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title,
                    description,
                    days: days.map(d => ({
                        dayNumber: d.dayNumber,
                        title: d.title,
                        exercises: d.exercises.map(e => ({
                            exerciseId: e.exerciseId,
                            sets: e.sets,
                            reps: e.reps,
                            rest: e.rest,
                            notes: e.notes
                        }))
                    }))
                })
            });

            if (!response.ok) throw new Error("Failed to save plan");
            alert("Plan saved successfully!");
        } catch (error) {
            console.error(error);
            alert("Error saving plan. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-mesh-gradient flex items-center justify-center">
                <div className="skeleton h-96 w-full max-w-4xl rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-mesh-gradient">
            <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-10">
                    <div className="flex-1 mr-8">
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-transparent border-none font-display text-4xl font-semibold text-text-primary outline-none focus:ring-0 placeholder:opacity-30"
                            placeholder="Untitled Plan"
                            aria-label="Plan Title"
                        />
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-transparent border-none text-text-secondary outline-none focus:ring-0 resize-none h-8 mt-2 placeholder:opacity-30"
                            placeholder="Add a description..."
                            aria-label="Plan Description"
                        />
                    </div>
                    <button
                        onClick={savePlan}
                        disabled={isSaving}
                        className="btn-primary disabled:opacity-50"
                    >
                        <Save size={14} />
                        {isSaving ? "SAVING..." : planId ? "UPDATE PLAN" : "SAVE PLAN"}
                    </button>
                </div>

                {/* Days */}
                <div className="space-y-6">
                    {days.map((day, dayIdx) => (
                        <div key={day.id} className="card overflow-hidden">
                            {/* Day Header */}
                            <div
                                role="button"
                                tabIndex={0}
                                className="flex items-center gap-3 px-5 py-4 bg-bg-secondary/50 cursor-pointer hover:bg-bg-secondary transition-colors"
                                onClick={() => toggleDay(dayIdx)}
                                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleDay(dayIdx)}
                                aria-expanded={day.isOpen}
                            >
                                {day.isOpen ? (
                                    <ChevronDown size={16} className="text-text-faint" />
                                ) : (
                                    <ChevronRight size={16} className="text-text-faint" />
                                )}
                                <input
                                    value={day.title}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                        const newDays = [...days];
                                        newDays[dayIdx].title = e.target.value;
                                        setDays(newDays);
                                    }}
                                    className="bg-transparent border-none text-sm font-semibold text-text-primary outline-none focus:ring-0 flex-1"
                                    aria-label={`Title for Day ${day.dayNumber}`}
                                />
                                <span className="badge badge-blue">
                                    {day.exercises.length} exercises
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const newDays = days.filter((_, i) => i !== dayIdx);
                                        setDays(newDays);
                                    }}
                                    className="btn-icon !p-1.5 hover:!bg-brand-red-glow hover:!text-brand-red"
                                    aria-label={`Delete Day ${day.dayNumber}`}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            {/* Exercises */}
                            {day.isOpen && (
                                <div className="p-5 space-y-3">
                                    {day.exercises.map((ex, exIdx) => (
                                        <div key={ex.id} className="flex items-center gap-4 group animate-slide-up">
                                            <GripVertical size={14} className="text-text-muted cursor-grab shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            {ex.demoVideoUrl && (
                                                <Image src={ex.demoVideoUrl} alt="" width={28} height={28} className="w-7 h-7 rounded object-cover shrink-0" />
                                            )}
                                            <span className="text-sm text-text-primary flex-1 truncate font-medium">
                                                {ex.name}
                                            </span>

                                            <div className="flex items-center gap-3 shrink-0">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="label-mono text-[9px]">SETS</span>
                                                    <input
                                                        type="number"
                                                        value={ex.sets}
                                                        onChange={(e) => {
                                                            const newDays = [...days];
                                                            newDays[dayIdx].exercises[exIdx].sets = Number.parseInt(e.target.value) || 0;
                                                            setDays(newDays);
                                                        }}
                                                        className="w-12 bg-bg-secondary border border-border rounded px-2 py-1 text-xs text-text-primary outline-none focus:border-brand-green/30"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="label-mono text-[9px]">REPS</span>
                                                    <input
                                                        value={ex.reps}
                                                        onChange={(e) => {
                                                            const newDays = [...days];
                                                            newDays[dayIdx].exercises[exIdx].reps = e.target.value;
                                                            setDays(newDays);
                                                        }}
                                                        className="w-16 bg-bg-secondary border border-border rounded px-2 py-1 text-xs text-text-primary outline-none focus:border-brand-green/30"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="label-mono text-[9px]">REST</span>
                                                    <input
                                                        value={ex.rest}
                                                        onChange={(e) => {
                                                            const newDays = [...days];
                                                            newDays[dayIdx].exercises[exIdx].rest = e.target.value;
                                                            setDays(newDays);
                                                        }}
                                                        className="w-16 bg-bg-secondary border border-border rounded px-2 py-1 text-xs text-text-primary outline-none focus:border-brand-green/30"
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => removeExercise(dayIdx, exIdx)}
                                                className="btn-icon !p-1.5 opacity-0 group-hover:opacity-100 hover:!bg-brand-red-glow hover:!text-brand-red transition-all"
                                                aria-label={`Remove ${ex.name}`}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}

                                    {/* Search / Add Exercise */}
                                    <div className="mt-4 relative">
                                        <div className="flex items-center gap-2 px-3 py-2.5 bg-bg-secondary/30 rounded-xl border border-dashed border-border hover:border-text-faint transition-colors cursor-text">
                                            <Search size={14} className="text-text-faint" />
                                            <input
                                                placeholder="Search exercises..."
                                                value={activeDayIdx === dayIdx ? searchTerm : ""}
                                                onFocus={() => setActiveDayIdx(dayIdx)}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="bg-transparent border-none text-sm text-text-primary outline-none focus:ring-0 flex-1 placeholder:text-text-faint"
                                                aria-label="Search exercises to add"
                                            />
                                        </div>

                                        {activeDayIdx === dayIdx && unifiedResults.length > 0 && (
                                            <div className="dropdown top-full left-0 right-0 mt-2 animate-scale-in">
                                                {unifiedResults.map((result) => (
                                                    <div
                                                        key={`${result.source}-${result.id}`}
                                                        onClick={() => handleResultClick(dayIdx, result)}
                                                        className="dropdown-item flex items-center gap-3"
                                                    >
                                                        {result.thumbnailUrl ? (
                                                            <Image src={result.thumbnailUrl} alt="" width={32} height={32} className="w-8 h-8 rounded-lg object-cover" />
                                                        ) : (
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${result.source === "ymove" ? "bg-blue-500/10 border border-blue-500/20 text-blue-400" : "bg-brand-green-glow border border-brand-green-border text-brand-green"}`}>
                                                                {result.source === "ymove" ? "\u{1F3AC}" : "\u{1F3CB}\u{FE0F}"}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="text-sm font-medium text-text-primary">{result.name}</p>
                                                            <p className="text-xs text-text-faint">{result.category} · {result.muscles.join(", ")}</p>
                                                        </div>
                                                        {result.source === "ymove" && (
                                                            <span className="ml-auto badge badge-blue text-[9px]">YMOVE</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Add Day Button */}
                    <button
                        onClick={addDay}
                        className="w-full h-14 flex items-center justify-center gap-2 border border-dashed border-border rounded-2xl text-text-faint hover:text-text-secondary hover:border-text-faint transition-all hover:bg-bg-card font-mono text-[10px] tracking-[0.2em]"
                    >
                        <Plus size={14} />
                        ADD NEW DAY
                    </button>
                </div>
            </div>
        </div>
    );
}
