import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { CreateDayPlanButton } from "@/components/plans/create-day-plan-button";
import { DayPlanNav } from "@/components/plans/day-plan-nav";
import { DayPlanContent } from "@/components/plans/day-plan-content";
import { PageHeader } from "@/components/page-header";
import {
  formatDayPlanContextLabel,
  isValidDateString,
  parseDateString,
} from "@/lib/dates";
import {
  getPlanSharesForOwner,
  getRecentShareRecipients,
} from "@/lib/plan-sharing";
import { getPlanReflectionData } from "@/lib/reflection-data";
import { getDayPlan } from "@/lib/plans";
import { serializePlan } from "@/lib/plan-serialize";
import { getPlanItemViewForUser } from "@/lib/user-preferences";

type DayPlanPageProps = {
  params: Promise<{ date: string }>;
};

export default async function DayPlanPage({ params }: DayPlanPageProps) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const { date: dateString } = await params;

  if (!isValidDateString(dateString)) {
    notFound();
  }

  const date = parseDateString(dateString);
  const plan = await getDayPlan(userId, date);
  const dateLabel = formatDayPlanContextLabel(date);
  const firstName = session.user?.name?.split(" ")[0];

  if (!plan) {
    return (
      <section className="space-y-6">
        <PageHeader
          title={dateLabel}
          subtitle="Daily plan"
          action={
            <Link href="/plans" className="ui-text-link">
              All plans
            </Link>
          }
        />

        <DayPlanNav currentDate={dateString} />

        <div className="ui-empty-state space-y-4">
          <p className="text-sm text-muted">No plan for this date yet.</p>
          <CreateDayPlanButton dateString={dateString} />
        </div>
      </section>
    );
  }

  const [platformShares, planItemView, reflectionData, recentShareRecipients] =
    await Promise.all([
      getPlanSharesForOwner(plan.id, userId),
      getPlanItemViewForUser(userId),
      getPlanReflectionData(plan.id, userId, session.user),
      getRecentShareRecipients(userId, plan.id),
    ]);

  return (
    <section className="space-y-6">
      <DayPlanContent
        currentDate={dateString}
        pageVariant="day"
        userFirstName={firstName}
        headerAction={
          <Link href="/plans" className="ui-text-link">
            All plans
          </Link>
        }
        plan={serializePlan(plan)}
        showCopyExport
        showPlatformShare
        platformShares={platformShares}
        recentShareRecipients={recentShareRecipients}
        itemView={planItemView}
        observations={reflectionData.observations}
        gratitudes={reflectionData.gratitudes}
        therapyThoughts={reflectionData.therapyThoughts}
      />
    </section>
  );
}
