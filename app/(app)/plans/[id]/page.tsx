import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { PlanEditor } from "@/components/plans/plan-editor";
import { getPlanWithItems } from "@/lib/plans";
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
  const plan = await getPlanWithItems(id, userId);

  if (!plan) {
    notFound();
  }

  return (
    <section>
      <PlanEditor plan={serializePlan(plan)} showShare />
    </section>
  );
}
