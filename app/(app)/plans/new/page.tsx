import { NewPlanFlow } from "@/components/plans/new-plan-flow";
import { PageHeader } from "@/components/page-header";

export default function NewPlanPage() {
  return (
    <section>
      <PageHeader
        title="New plan"
        subtitle="Type or record notes, structure them, then save."
      />
      <NewPlanFlow />
    </section>
  );
}
