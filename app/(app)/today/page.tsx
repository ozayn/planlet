import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CreateTodayPlanButton } from "@/components/plans/create-today-plan-button";
import { DayPlanNav } from "@/components/plans/day-plan-nav";
import { DayPlanContent } from "@/components/plans/day-plan-content";
import { PageHeader } from "@/components/page-header";
import { getKudosForPlan } from "@/lib/kudos";
import { formatDateString } from "@/lib/dates";
import { getPlanReflectionData } from "@/lib/reflection-data";
import {
  getPlanSharesForOwner,
  getRecentShareRecipients,
} from "@/lib/plan-sharing";
import { getTodayPlan } from "@/lib/plans";
import { serializePlan } from "@/lib/plan-serialize";
import { getPlanItemViewForUser } from "@/lib/user-preferences";

export default async function TodayPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/");
  }

  const [plan, planItemView] = await Promise.all([
    getTodayPlan(userId),
    getPlanItemViewForUser(userId),
  ]);
  const [kudos, reflectionData, platformShares, recentShareRecipients] = plan
    ? await Promise.all([
        getKudosForPlan(plan.id, userId),
        getPlanReflectionData(plan.id, userId, session.user, {
          includeTherapyThoughts: true,
        }),
        getPlanSharesForOwner(plan.id, userId),
        getRecentShareRecipients(userId, plan.id),
      ])
    : [[], { observations: undefined, gratitudes: undefined, therapyThoughts: undefined }, [], []];
  const firstName = session.user?.name?.split(" ")[0];
  const todayDate = formatDateString(new Date());

  return (
    <section className="ui-page-stack space-y-6">
      {plan ? (
        <DayPlanContent
          currentDate={todayDate}
          pageVariant="today"
          userFirstName={firstName}
          headerAction={
            <Link href="/plans/new" className="ui-text-link">
              New plan
            </Link>
          }
          plan={serializePlan(plan)}
          showCopyExport
          showPlatformShare
          platformShares={platformShares}
          recentShareRecipients={recentShareRecipients}
          showDeletePlan
          deleteRedirectTo="/today"
          kudos={kudos.map((entry) => ({
            id: entry.id,
            type: entry.type,
            sender: entry.sender,
          }))}
          itemView={planItemView}
          observations={reflectionData.observations}
          gratitudes={reflectionData.gratitudes}
          therapyThoughts={reflectionData.therapyThoughts}
        />
      ) : (
        <>
          <PageHeader
            title={firstName ? `Today, ${firstName}` : "Today"}
            subtitle="What matters right now."
          />
          <DayPlanNav currentDate={todayDate} />
          <div className="space-y-6">
            <div className="ui-empty-state">
              <p className="text-sm text-muted">No list for today yet.</p>
            </div>
            <CreateTodayPlanButton />
          </div>
        </>
      )}
    </section>
  );
}
