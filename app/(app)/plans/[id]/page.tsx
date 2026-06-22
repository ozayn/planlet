import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { PlanEditor } from "@/components/plans/plan-editor";
import { PlanReadOnly } from "@/components/plans/plan-read-only";
import { getKudosForPlan, getViewerKudosForPlan } from "@/lib/kudos";
import {
  getPlanAccess,
  getPlanSharesForOwner,
  getRecentShareRecipients,
} from "@/lib/plan-sharing";
import { getPlanReflectionData } from "@/lib/reflection-data";
import { getPeriodSummaryHref } from "@/lib/period-summary-links";
import { getPlanWithItems } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { serializePlan } from "@/lib/plan-serialize";
import { getPlanningPreferencesForUser } from "@/lib/user-preferences";
import { getThemeProjectCatalog } from "@/lib/themes-projects";

type PlanDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlanDetailPage({ params }: PlanDetailPageProps) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const { id } = await params;
  const access = await getPlanAccess(id, userId);

  if (!access) {
    notFound();
  }

  const plan = await getPlanWithItems(id, userId);

  if (!plan) {
    notFound();
  }

  const serialized = serializePlan(plan);
  const [planningPreferences, themeProjectCatalog] = await Promise.all([
    getPlanningPreferencesForUser(userId),
    getThemeProjectCatalog(userId),
  ]);

  if (access === "view") {
    const share = await prisma.planShare.findFirst({
      where: { planId: id, sharedWithUserId: userId },
      include: {
        owner: { select: { name: true, email: true } },
      },
    });

    const ownerLabel =
      share?.owner.name ?? share?.owner.email ?? "another user";

    const viewerKudos = await getViewerKudosForPlan(id, userId);

    return (
      <section>
        <PlanReadOnly
          plan={serialized}
          ownerLabel={ownerLabel}
          planId={id}
          viewerKudos={
            viewerKudos
              ? { type: viewerKudos.type }
              : null
          }
          itemView={planningPreferences.planItemView}
        />
      </section>
    );
  }

  const [platformShares, kudos, reflectionData, recentShareRecipients] =
    await Promise.all([
      getPlanSharesForOwner(id, userId),
      getKudosForPlan(id, userId),
      getPlanReflectionData(id, userId, session.user, {
        includeTherapyThoughts: plan.type === "DAY",
      }),
      getRecentShareRecipients(userId, id),
    ]);

  const periodSummaryHref =
    plan.type === "MONTH" || plan.type === "YEAR"
      ? getPeriodSummaryHref(plan.type, plan.dateStart)
      : undefined;
  const periodSummaryLabel =
    plan.type === "MONTH"
      ? "Month summary"
      : plan.type === "YEAR"
        ? "Year summary"
        : undefined;

  return (
    <section>
      <PlanEditor
        plan={serialized}
        showCopyExport
        showPlatformShare
        showDeletePlan
        deleteRedirectTo="/plans"
        platformShares={platformShares}
        recentShareRecipients={recentShareRecipients}
        kudos={kudos.map((entry) => ({
          id: entry.id,
          type: entry.type,
          sender: entry.sender,
        }))}
        itemView={planningPreferences.planItemView}
        periodSummaryHref={periodSummaryHref}
        periodSummaryLabel={periodSummaryLabel}
        observations={reflectionData.observations}
        gratitudes={reflectionData.gratitudes}
        therapyThoughts={reflectionData.therapyThoughts}
        themeProjectCatalog={themeProjectCatalog}
        taskOrganizationDisplay={planningPreferences.taskOrganizationDisplay}
      />
    </section>
  );
}
