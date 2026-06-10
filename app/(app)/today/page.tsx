import Link from "next/link";

import { auth } from "@/auth";
import { CreateTodayPlanButton } from "@/components/plans/create-today-plan-button";
import { DayPlanNav } from "@/components/plans/day-plan-nav";
import { PlanEditor } from "@/components/plans/plan-editor";
import { PageHeader } from "@/components/page-header";
import { getKudosForPlan } from "@/lib/kudos";
import { formatDateString } from "@/lib/dates";
import { getTodayPlan } from "@/lib/plans";
import { serializePlan } from "@/lib/plan-serialize";
import { getPlanItemViewForUser } from "@/lib/user-preferences";

export default async function TodayPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const [plan, planItemView] = await Promise.all([
    getTodayPlan(userId),
    getPlanItemViewForUser(userId),
  ]);
  const kudos = plan ? await getKudosForPlan(plan.id, userId) : [];
  const firstName = session.user?.name?.split(" ")[0];
  const todayDate = formatDateString(new Date());

  return (
    <section className="space-y-6">
      <PageHeader
        title={firstName ? `Today, ${firstName}` : "Today"}
        subtitle="What matters right now."
        action={
          <Link href="/plans/new" className="ui-text-link">
            New plan
          </Link>
        }
      />

      <DayPlanNav currentDate={todayDate} />

      {plan ? (
        <div className="space-y-4">
          <PlanEditor
            plan={serializePlan(plan)}
            showMeta={false}
            showCopyExport
            fullPlanHref={`/plans/${plan.id}`}
            kudos={kudos.map((entry) => ({
              id: entry.id,
              type: entry.type,
              sender: entry.sender,
            }))}
            itemView={planItemView}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="ui-empty-state">
            <p className="text-sm text-muted">No list for today yet.</p>
          </div>
          <CreateTodayPlanButton />
        </div>
      )}
    </section>
  );
}
