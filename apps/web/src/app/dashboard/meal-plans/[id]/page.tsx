"use client";

import { useParams } from "next/navigation";
import MealPlanBuilder from "@/components/MealPlanBuilder";

export default function EditMealPlanPage() {
    const params = useParams();
    const planId = params.id as string;

    return <MealPlanBuilder planId={planId} />;
}
