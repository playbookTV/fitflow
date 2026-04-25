"use client";

import { useState } from "react";
import MealPlanBuilder from "@/components/MealPlanBuilder";
import MealTemplatePicker from "@/components/MealTemplatePicker";
import { DashboardLayout } from "@/components/DashboardLayout";

export default function NewMealPlanPage() {
    const [mode, setMode] = useState<"pick" | "scratch">("pick");

    if (mode === "scratch") {
        return <MealPlanBuilder />;
    }

    return (
        <DashboardLayout
            title="New Meal Plan"
            subtitle="Start from a template or build your own"
        >
            <MealTemplatePicker onStartFromScratch={() => setMode("scratch")} />
        </DashboardLayout>
    );
}
