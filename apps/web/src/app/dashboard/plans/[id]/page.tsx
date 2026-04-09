import PlanBuilder from "@/components/PlanBuilder";

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <PlanBuilder planId={id} />;
}
