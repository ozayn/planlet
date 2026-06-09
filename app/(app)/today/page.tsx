import { auth } from "@/auth";
import { CreateTodayPlanButton } from "@/components/plans/create-today-plan-button";
import { NewPlanLink } from "@/components/plans/new-plan-link";
import { PlanEditor } from "@/components/plans/plan-editor";
import { PageHeader } from "@/components/page-header";
import { getTodayPlan } from "@/lib/plans";
import { serializePlan } from "@/lib/plan-serialize";

export default async function TodayPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const plan = await getTodayPlan(userId);
  const firstName = session.user?.name?.split(" ")[0];

  return (
    <section>
      <PageHeader
        title={firstName ? `Today, ${firstName}` : "Today"}
        subtitle="A calm view of what matters right now."
      />

      <div className="mb-8">
        <NewPlanLink />
      </div>

      {plan ? (
        <PlanEditor plan={serializePlan(plan)} showMeta={false} showShare />
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-dashed border-border bg-surface/70 px-5 py-12 text-center">
            <p className="text-sm leading-relaxed text-muted" dir="auto">
              Start with a messy list. You can structure it later — or paste and
              record on New plan first.
            </p>
          </div>
          <CreateTodayPlanButton />
          <p className="text-center text-xs text-muted-light">
            Good enough counts.
          </p>
        </div>
      )}
    </section>
  );
}
