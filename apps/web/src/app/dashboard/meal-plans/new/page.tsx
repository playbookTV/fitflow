"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MealPlanBuilder from "@/components/MealPlanBuilder";
import MealTemplatePicker from "@/components/MealTemplatePicker";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Loader2 } from "lucide-react";

function NewMealPlanContent() {
    const searchParams = useSearchParams();
    const mode = searchParams.get("mode");

    if (mode === "scratch") {
        return <MealPlanBuilder />;
    }

    return (
        <DashboardLayout
            title="New Meal Plan"
            subtitle="Start from a template or build your own"
        >
            <MealTemplatePicker onStartFromScratch={() => {
                window.location.href = "/dashboard/meal-plans/new?mode=scratch";
            }} />
        </DashboardLayout>
    );
}

export default function NewMealPlanPage() {
    return (
        <Suspense fallback={
            <DashboardLayout title="New Meal Plan">
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-text-faint" />
                </div>
            </DashboardLayout>
        }>
            <NewMealPlanContent />
        </Suspense>
    );
}
