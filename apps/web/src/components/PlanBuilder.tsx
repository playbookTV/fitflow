"use client";

import { useState, useEffect, useRef } from "react";
import {
    Plus, Search, GripVertical, Save, Trash2, ChevronDown, ChevronRight, Sparkles, Loader2
} from "lucide-react";
import Image from "next/image";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getAuthHeaders } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalClose } from "@/components/ui/Modal";

interface AiClient {
    id: string;
    name: string;
    goals?: string;
}

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

/* ─── Sortable Exercise Row ─── */
function SortableExercise({
    ex,
    dayIdx,
    exIdx,
    onUpdate,
    onRemove,
}: {
    ex: PlanExercise;
    dayIdx: number;
    exIdx: number;
    onUpdate: (dayIdx: number, exIdx: number, field: string, value: string | number) => void;
    onRemove: (dayIdx: number, exIdx: number) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: ex.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-4 group">
            <button
                type="button"
                className="text-text-muted cursor-grab shrink-0 opacity-0 group-hover:opacity-100 transition-opacity touch-none"
                aria-label={`Drag to reorder ${ex.name}`}
                {...attributes}
                {...listeners}
            >
                <GripVertical size={14} />
            </button>
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
                        onChange={(e) => onUpdate(dayIdx, exIdx, "sets", Number.parseInt(e.target.value) || 0)}
                        className="w-12 bg-bg-secondary border border-border rounded px-2 py-1 text-xs text-text-primary focus-visible:outline-transparent focus-visible:ring-2 focus-visible:ring-brand-green/50 focus:border-brand-green/30"
                        aria-label="Sets"
                    />
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="label-mono text-[9px]">REPS</span>
                    <input
                        value={ex.reps}
                        onChange={(e) => onUpdate(dayIdx, exIdx, "reps", e.target.value)}
                        className="w-16 bg-bg-secondary border border-border rounded px-2 py-1 text-xs text-text-primary focus-visible:outline-transparent focus-visible:ring-2 focus-visible:ring-brand-green/50 focus:border-brand-green/30"
                        aria-label="Reps"
                    />
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="label-mono text-[9px]">REST</span>
                    <input
                        value={ex.rest}
                        onChange={(e) => onUpdate(dayIdx, exIdx, "rest", e.target.value)}
                        className="w-16 bg-bg-secondary border border-border rounded px-2 py-1 text-xs text-text-primary focus-visible:outline-transparent focus-visible:ring-2 focus-visible:ring-brand-green/50 focus:border-brand-green/30"
                        aria-label="Rest"
                    />
                </div>
            </div>

            <button
                onClick={() => onRemove(dayIdx, exIdx)}
                className="btn-icon-danger opacity-0 group-hover:opacity-100 transition-[opacity,background-color,color]"
                aria-label={`Remove ${ex.name}`}
            >
                <Trash2 size={14} />
            </button>
        </div>
    );
}

export default function PlanBuilder({ planId }: PlanBuilderProps) {
    const { toast } = useToast();
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

    // AI generation state
    const [showAiModal, setShowAiModal] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiClients, setAiClients] = useState<AiClient[]>([]);
    const [aiClientId, setAiClientId] = useState("");
    const [aiInstructions, setAiInstructions] = useState("");
    const [aiError, setAiError] = useState("");
    const aiAbortRef = useRef<AbortController | null>(null);

    // Drag state
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [activeDragType, setActiveDragType] = useState<"day" | "exercise" | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const closeAiModal = () => {
        if (aiAbortRef.current) {
            aiAbortRef.current.abort();
            aiAbortRef.current = null;
        }
        setShowAiModal(false);
        setIsGenerating(false);
    };

    // Load existing plan data when editing
    useEffect(() => {
        if (!planId) return;

        getAuthHeaders().then((headers) =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/plans/${planId}`, {
            headers,
        }))
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

        getAuthHeaders().then((headers) =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/exercises/unified-search?q=${encodeURIComponent(searchTerm)}`, {
            headers,
            signal: controller.signal,
        }))
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
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/exercises/ymove-import`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(await getAuthHeaders()),
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

    const updateExerciseField = (dayIdx: number, exIdx: number, field: string, value: string | number) => {
        const newDays = [...days];
        const exercise = newDays[dayIdx].exercises[exIdx];
        if (field === "sets") exercise.sets = value as number;
        else if (field === "reps") exercise.reps = value as string;
        else if (field === "rest") exercise.rest = value as string;
        setDays(newDays);
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

    /* ─── Day drag handlers ─── */
    const handleDayDragStart = (event: DragStartEvent) => {
        setActiveDragId(String(event.active.id));
        setActiveDragType("day");
    };

    const handleDayDragEnd = (event: DragEndEvent) => {
        setActiveDragId(null);
        setActiveDragType(null);
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        setDays((prev) => {
            const oldIdx = prev.findIndex((d) => d.id === active.id);
            const newIdx = prev.findIndex((d) => d.id === over.id);
            const reordered = arrayMove(prev, oldIdx, newIdx);
            return reordered.map((d, i) => ({ ...d, dayNumber: i + 1 }));
        });
    };

    /* ─── Exercise drag handlers (scoped per day) ─── */
    const handleExerciseDragStart = (event: DragStartEvent) => {
        setActiveDragId(String(event.active.id));
        setActiveDragType("exercise");
    };

    const handleExerciseDragEnd = (dayIdx: number) => (event: DragEndEvent) => {
        setActiveDragId(null);
        setActiveDragType(null);
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        setDays((prev) => {
            const newDays = [...prev];
            const exercises = [...newDays[dayIdx].exercises];
            const oldIdx = exercises.findIndex((e) => e.id === active.id);
            const newIdx = exercises.findIndex((e) => e.id === over.id);
            newDays[dayIdx] = { ...newDays[dayIdx], exercises: arrayMove(exercises, oldIdx, newIdx) };
            return newDays;
        });
    };

    const openAiModal = async () => {
        setShowAiModal(true);
        setAiError("");
        setAiClientId("");
        setAiInstructions("");
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients`, { headers });
            if (res.ok) setAiClients(await res.json());
        } catch {
            // Non-critical — client list is optional
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setAiError("");
        const abort = new AbortController();
        aiAbortRef.current = abort;
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/plans/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify({
                    ...(aiClientId ? { clientId: aiClientId } : {}),
                    ...(aiInstructions ? { instructions: aiInstructions } : {}),
                }),
                signal: abort.signal,
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to generate plan");
            }

            const plan = await res.json();
            setTitle(plan.title || "AI Generated Plan");
            setDescription(plan.description || "");
            setDays(
                (plan.days ?? []).map((day: { dayNumber: number; title: string; exercises: { exerciseId: string; exerciseName: string; sets: number; reps: string; rest: string; notes: string }[] }, idx: number) => ({
                    id: crypto.randomUUID(),
                    dayNumber: day.dayNumber ?? idx + 1,
                    title: day.title || `Day ${idx + 1}`,
                    isOpen: true,
                    exercises: (day.exercises ?? []).map((ex: { exerciseId: string; exerciseName: string; sets: number; reps: string; rest: string; notes: string }) => ({
                        id: crypto.randomUUID(),
                        exerciseId: ex.exerciseId,
                        name: ex.exerciseName || "Unknown",
                        sets: ex.sets ?? 3,
                        reps: ex.reps || "10-12",
                        rest: ex.rest || "60s",
                        notes: ex.notes || "",
                    })),
                }))
            );
            setShowAiModal(false);
        } catch (err) {
            if (err instanceof DOMException && err.name === "AbortError") return;
            setAiError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            aiAbortRef.current = null;
            setIsGenerating(false);
        }
    };

    const savePlan = async () => {
        setIsSaving(true);
        try {
            const url = planId
                ? `${process.env.NEXT_PUBLIC_API_URL}/plans/${planId}`
                : `${process.env.NEXT_PUBLIC_API_URL}/plans`;
            const response = await fetch(url, {
                method: planId ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(await getAuthHeaders()),
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
            toast({ variant: "success", title: "Plan Saved" });
        } catch (error) {
            console.error(error);
            toast({ variant: "error", title: "Save Failed", description: "Please try again." });
        } finally {
            setIsSaving(false);
        }
    };

    const activeDragDay = activeDragType === "day" && activeDragId
        ? days.find((d) => d.id === activeDragId)
        : null;

    if (loading) {
        return (
            <div className="min-h-dvh bg-mesh-gradient flex items-center justify-center">
                <div className="skeleton h-96 w-full max-w-4xl rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="min-h-dvh bg-mesh-gradient">
            <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-10">
                    <div className="flex-1 mr-8">
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-transparent border-none font-display text-4xl font-semibold text-text-primary focus-visible:outline-transparent focus-visible:ring-2 focus-visible:ring-brand-green/50 placeholder:opacity-30"
                            placeholder="Untitled Plan"
                            aria-label="Plan Title"
                        />
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-transparent border-none text-text-secondary focus-visible:outline-transparent focus-visible:ring-2 focus-visible:ring-brand-green/50 resize-y min-h-[2.5rem] mt-2 placeholder:opacity-30"
                            placeholder="Add a description…"
                            aria-label="Plan Description"
                        />
                    </div>
                    <button
                        onClick={openAiModal}
                        className="btn-secondary"
                    >
                        <Sparkles size={14} />
                        GENERATE WITH AI
                    </button>
                    <button
                        onClick={savePlan}
                        disabled={isSaving}
                        className="btn-primary disabled:opacity-50"
                    >
                        <Save size={14} />
                        {isSaving ? "SAVING…" : planId ? "UPDATE PLAN" : "SAVE PLAN"}
                    </button>
                </div>

                {/* Days — sortable */}
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDayDragStart}
                    onDragEnd={handleDayDragEnd}
                >
                    <SortableContext items={days.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-6">
                            {days.map((day, dayIdx) => (
                                <SortableDayCard
                                    key={day.id}
                                    day={day}
                                    dayIdx={dayIdx}
                                    days={days}
                                    setDays={setDays}
                                    searchTerm={searchTerm}
                                    setSearchTerm={setSearchTerm}
                                    activeDayIdx={activeDayIdx}
                                    setActiveDayIdx={setActiveDayIdx}
                                    unifiedResults={unifiedResults}
                                    sensors={sensors}
                                    toggleDay={toggleDay}
                                    updateExerciseField={updateExerciseField}
                                    removeExercise={removeExercise}
                                    handleResultClick={handleResultClick}
                                    handleExerciseDragStart={handleExerciseDragStart}
                                    handleExerciseDragEnd={handleExerciseDragEnd}
                                />
                            ))}

                            {/* Add Day Button */}
                            <button
                                onClick={addDay}
                                className="w-full h-14 flex items-center justify-center gap-2 border border-dashed border-border rounded-2xl text-text-faint hover:text-text-secondary hover:border-text-faint transition-[color,border-color,background-color] hover:bg-bg-card font-mono text-[10px] tracking-[0.2em]"
                            >
                                <Plus size={14} />
                                ADD NEW DAY
                            </button>
                        </div>
                    </SortableContext>

                    <DragOverlay>
                        {activeDragDay && (
                            <div className="card opacity-90 shadow-2xl rotate-1">
                                <div className="flex items-center gap-3 px-5 py-4 bg-bg-secondary/50 rounded-t-2xl">
                                    <GripVertical size={14} className="text-text-muted" />
                                    <span className="text-sm font-semibold text-text-primary">{activeDragDay.title}</span>
                                    <span className="badge badge-blue tabular-nums ml-auto">
                                        {activeDragDay.exercises.length} exercises
                                    </span>
                                </div>
                            </div>
                        )}
                    </DragOverlay>
                </DndContext>

                {/* AI Generation Modal */}
                <Modal open={showAiModal} onOpenChange={(open) => { if (!open) closeAiModal(); }}>
                    <ModalContent aria-describedby={undefined}>
                        <ModalHeader>
                            <ModalTitle className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-brand-green" aria-hidden="true" />
                                Generate with AI
                            </ModalTitle>
                            <ModalClose />
                        </ModalHeader>
                        <div className="p-6 space-y-5">
                            <div className="form-field">
                                <label className="label-mono" htmlFor="aiClient">Client (optional)</label>
                                <select
                                    id="aiClient"
                                    name="aiClient"
                                    value={aiClientId}
                                    onChange={(e) => setAiClientId(e.target.value)}
                                    className="select w-full"
                                    disabled={isGenerating}
                                >
                                    <option value="">No client — general plan</option>
                                    {aiClients.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-text-faint mt-1">
                                    Selecting a client personalises the plan to their goals and history.
                                </p>
                            </div>

                            <div className="form-field">
                                <label className="label-mono" htmlFor="aiInstructions">Instructions</label>
                                <textarea
                                    id="aiInstructions"
                                    name="aiInstructions"
                                    value={aiInstructions}
                                    onChange={(e) => setAiInstructions(e.target.value)}
                                    placeholder="e.g., 3-day upper/lower split, focus on hypertrophy…"
                                    className="input w-full resize-none h-24"
                                    maxLength={1000}
                                    disabled={isGenerating}
                                />
                            </div>

                            {aiError && <p className="text-sm text-brand-red">{aiError}</p>}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={closeAiModal}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="btn-primary disabled:opacity-50"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Generating…
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            Generate Plan
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </ModalContent>
                </Modal>
            </div>
        </div>
    );
}

/* ─── Sortable Day Card (extracted to use useSortable hook) ─── */
function SortableDayCard({
    day,
    dayIdx,
    days,
    setDays,
    searchTerm,
    setSearchTerm,
    activeDayIdx,
    setActiveDayIdx,
    unifiedResults,
    sensors,
    toggleDay,
    updateExerciseField,
    removeExercise,
    handleResultClick,
    handleExerciseDragStart,
    handleExerciseDragEnd,
}: {
    day: PlanDay;
    dayIdx: number;
    days: PlanDay[];
    setDays: React.Dispatch<React.SetStateAction<PlanDay[]>>;
    searchTerm: string;
    setSearchTerm: (v: string) => void;
    activeDayIdx: number | null;
    setActiveDayIdx: (v: number | null) => void;
    unifiedResults: UnifiedResult[];
    sensors: ReturnType<typeof useSensors>;
    toggleDay: (idx: number) => void;
    updateExerciseField: (dayIdx: number, exIdx: number, field: string, value: string | number) => void;
    removeExercise: (dayIdx: number, exIdx: number) => void;
    handleResultClick: (dayIdx: number, result: UnifiedResult) => void;
    handleExerciseDragStart: (event: DragStartEvent) => void;
    handleExerciseDragEnd: (dayIdx: number) => (event: DragEndEvent) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: day.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="card">
            {/* Day Header */}
            <div
                className="flex items-center gap-3 px-5 py-4 bg-bg-secondary/50 cursor-pointer hover:bg-bg-secondary transition-colors rounded-t-2xl"
            >
                <button
                    type="button"
                    className="text-text-muted cursor-grab shrink-0 touch-none"
                    aria-label={`Drag to reorder ${day.title}`}
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical size={14} />
                </button>
                <button
                    type="button"
                    className="shrink-0 text-text-faint"
                    onClick={() => toggleDay(dayIdx)}
                    aria-expanded={day.isOpen}
                    aria-label={day.isOpen ? `Collapse ${day.title}` : `Expand ${day.title}`}
                >
                    {day.isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <input
                    value={day.title}
                    onChange={(e) => {
                        const newDays = [...days];
                        newDays[dayIdx].title = e.target.value;
                        setDays(newDays);
                    }}
                    className="bg-transparent border-none text-sm font-semibold text-text-primary focus-visible:outline-transparent focus-visible:ring-2 focus-visible:ring-brand-green/50 flex-1"
                    aria-label={`Title for Day ${day.dayNumber}`}
                />
                <span className="badge badge-blue tabular-nums">
                    {day.exercises.length} exercises
                </span>
                <button
                    onClick={() => {
                        const newDays = days.filter((_, i) => i !== dayIdx);
                        setDays(newDays);
                    }}
                    className="btn-icon-danger"
                    aria-label={`Delete Day ${day.dayNumber}`}
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {/* Exercises — sortable within day */}
            {day.isOpen && (
                <div className="p-5 space-y-3">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleExerciseDragStart}
                        onDragEnd={handleExerciseDragEnd(dayIdx)}
                    >
                        <SortableContext items={day.exercises.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                            {day.exercises.map((ex, exIdx) => (
                                <SortableExercise
                                    key={ex.id}
                                    ex={ex}
                                    dayIdx={dayIdx}
                                    exIdx={exIdx}
                                    onUpdate={updateExerciseField}
                                    onRemove={removeExercise}
                                />
                            ))}
                        </SortableContext>

                        <DragOverlay>
                            {/* Exercise drag overlay is handled by the outer context — no per-day overlay needed */}
                        </DragOverlay>
                    </DndContext>

                    {/* Search / Add Exercise */}
                    <div className="mt-4 relative">
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-bg-secondary/30 rounded-xl border border-dashed border-border hover:border-text-faint transition-colors cursor-text">
                            <Search size={14} className="text-text-faint" />
                            <input
                                placeholder="Search exercises…"
                                value={activeDayIdx === dayIdx ? searchTerm : ""}
                                onFocus={() => setActiveDayIdx(dayIdx)}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-transparent border-none text-sm text-text-primary focus-visible:outline-transparent focus-visible:ring-2 focus-visible:ring-brand-green/50 flex-1 placeholder:text-text-faint"
                                aria-label="Search exercises to add"
                            />
                        </div>

                        {activeDayIdx === dayIdx && unifiedResults.length > 0 && (
                            <div className="dropdown top-full left-0 right-0 mt-2 animate-scale-in" role="listbox">
                                {unifiedResults.map((result) => (
                                    <button
                                        type="button"
                                        key={`${result.source}-${result.id}`}
                                        onClick={() => handleResultClick(dayIdx, result)}
                                        className="dropdown-item flex items-center gap-3 w-full text-left"
                                        role="option"
                                        aria-selected={false}
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
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
