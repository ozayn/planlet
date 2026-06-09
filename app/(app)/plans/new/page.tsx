import { NewPlanFlow } from "@/components/plans/new-plan-flow";
import { PageHeader } from "@/components/page-header";

export default function NewPlanPage() {
  return (
    <section>
      <PageHeader
        title="New plan"
        subtitle="Paste messy notes, review the structure, then save when it feels right."
      />
      <NewPlanFlow />
    </section>
  );
}
