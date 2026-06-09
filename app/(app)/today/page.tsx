import Link from "next/link";

import { auth } from "@/auth";
import { CreateTodayPlanButton } from "@/components/plans/create-today-plan-button";
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
        subtitle="What matters right now."
        action={
          <Link href="/plans/new" className="ui-text-link">
            New plan from notes
          </Link>
        }
      />

      {plan ? (
        <PlanEditor plan={serializePlan(plan)} showMeta={false} showShare />
      ) : (
        <div className="space-y-6">
          <div className="ui-empty-state">
            <p className="text-sm leading-relaxed text-muted">
              Start a list for today, or structure notes on{" "}
              <Link href="/plans/new" className="ui-text-link">
                New plan
              </Link>
              .
            </p>
          </div>
          <CreateTodayPlanButton />
        </div>
      )}
    </section>
  );
}
