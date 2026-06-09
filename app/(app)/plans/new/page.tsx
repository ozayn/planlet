import { NewPlanFlow } from "@/components/plans/new-plan-flow";
import { PageHeader } from "@/components/page-header";

export default function NewPlanPage() {
  return (
    <section>
      <PageHeader
        title="New plan"
        subtitle="Capture, structure, review, save."
      />
      <NewPlanFlow />
    </section>
  );
}
