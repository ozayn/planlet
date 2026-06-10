import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { PlanEditor } from "@/components/plans/plan-editor";
import { PlanReadOnly } from "@/components/plans/plan-read-only";
import { getKudosForPlan, getViewerKudosForPlan } from "@/lib/kudos";
import { getPlanAccess, getPlanSharesForOwner } from "@/lib/plan-sharing";
import { getPlanWithItems } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { serializePlan } from "@/lib/plan-serialize";

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
        />
      </section>
    );
  }

  const [platformShares, kudos] = await Promise.all([
    getPlanSharesForOwner(id, userId),
    getKudosForPlan(id, userId),
  ]);

  return (
    <section>
      <PlanEditor
        plan={serialized}
        showCopyExport
        showPlatformShare
        platformShares={platformShares}
        kudos={kudos.map((entry) => ({
          id: entry.id,
          type: entry.type,
          sender: entry.sender,
        }))}
      />
    </section>
  );
}
