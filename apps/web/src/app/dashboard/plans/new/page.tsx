"use client";

import { useState } from "react";
import PlanBuilder from "@/components/PlanBuilder";
import TemplatePicker from "@/components/TemplatePicker";
import { DashboardLayout } from "@/components/DashboardLayout";

export default function NewPlanPage() {
    const [mode, setMode] = useState<"pick" | "scratch">("pick");

    if (mode === "scratch") {
        return <PlanBuilder />;
    }

    return (
        <DashboardLayout
            title="New Workout Plan"
            subtitle="Start from a template or build your own"
        >
            <TemplatePicker onStartFromScratch={() => setMode("scratch")} />
        </DashboardLayout>
    );
}
