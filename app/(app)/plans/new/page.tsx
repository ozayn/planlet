import { NewPlanFlow } from "@/components/plans/new-plan-flow";
import { PageHeader } from "@/components/page-header";

export default function NewPlanPage() {
  return (
    <section>
      <PageHeader
        title="New plan"
        subtitle="Write, record, or import — then review and save."
      />
      <NewPlanFlow />
    </section>
  );
}
