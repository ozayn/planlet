import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CreateTodayPlanButton } from "@/components/plans/create-today-plan-button";
import { DayPlanNav } from "@/components/plans/day-plan-nav";
import { DayPlanContent } from "@/components/plans/day-plan-content";
import { PageHeader } from "@/components/page-header";
import { getKudosForPlan } from "@/lib/kudos";
import { getTodayDateString } from "@/lib/dates";
import { getPlanReflectionData } from "@/lib/reflection-data";
import {
  getPlanSharesForOwner,
  getRecentShareRecipients,
} from "@/lib/plan-sharing";
import { loadFocusPrioritiesForAdminUser } from "@/lib/focus-priorities";
import { ensureDefaultLifeAreas } from "@/lib/life-areas";
import { getTodayPlan } from "@/lib/plans";
import { serializePlan } from "@/lib/plan-serialize";
import { getPlanningPreferencesForUser } from "@/lib/user-preferences";
import { getThemeProjectCatalog } from "@/lib/themes-projects";
import { FALLBACK_TIMEZONE } from "@/lib/user-timezone-constants";

export default async function TodayPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/");
  }

  // Seed + auto-add Focus Priority tasks before loading today's plan so new
  // items appear on the first paint (admin-only; no-op for other roles).
  const focusPriorities = await loadFocusPrioritiesForAdminUser(
    userId,
    session.user.role,
  );

  const [plan, planningPreferences, themeProjectCatalog, lifeAreas] =
    await Promise.all([
      getTodayPlan(userId),
      getPlanningPreferencesForUser(userId),
      getThemeProjectCatalog(userId),
      ensureDefaultLifeAreas(userId),
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
  const timezone = session.user?.timezone ?? FALLBACK_TIMEZONE;
  const todayDate = getTodayDateString(timezone);

  return (
    <section className="ui-page-stack space-y-6">
      {plan ? (
        <DayPlanContent
          currentDate={todayDate}
          timezone={timezone}
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
          itemView={planningPreferences.planItemView}
          observations={reflectionData.observations}
          gratitudes={reflectionData.gratitudes}
          therapyThoughts={reflectionData.therapyThoughts}
          themeProjectCatalog={themeProjectCatalog}
          taskOrganizationDisplay={planningPreferences.taskOrganizationDisplay}
          planOrganizeView={planningPreferences.planOrganizeView}
          lifeAreas={lifeAreas}
          focusPriorities={focusPriorities}
        />
      ) : (
        <>
          <PageHeader
            title={firstName ? `Today, ${firstName}` : "Today"}
            subtitle="What matters right now."
          />
          <DayPlanNav currentDate={todayDate} timezone={timezone} />
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
