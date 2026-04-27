"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PlanBuilder from "@/components/PlanBuilder";
import TemplatePicker from "@/components/TemplatePicker";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Loader2 } from "lucide-react";

function NewPlanContent() {
    const searchParams = useSearchParams();
    const mode = searchParams.get("mode");

    if (mode === "scratch") {
        return <PlanBuilder />;
    }

    return (
        <DashboardLayout
            title="New Workout Plan"
            subtitle="Start from a template or build your own"
        >
            <TemplatePicker onStartFromScratch={() => {
                window.location.href = "/dashboard/plans/new?mode=scratch";
            }} />
        </DashboardLayout>
    );
}

export default function NewPlanPage() {
    return (
        <Suspense fallback={
            <DashboardLayout title="New Workout Plan">
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-text-faint" />
                </div>
            </DashboardLayout>
        }>
            <NewPlanContent />
        </Suspense>
    );
}
