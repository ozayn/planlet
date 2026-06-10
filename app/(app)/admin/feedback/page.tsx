import type { FeedbackArea, FeedbackStatus } from "@/app/generated/prisma/client";
import Link from "next/link";
import { Suspense } from "react";

import { AdminFeedbackFilters } from "@/components/admin/admin-feedback-filters";
import { AdminFeedbackList } from "@/components/admin/admin-feedback-list";
import { PageHeader } from "@/components/page-header";
import { FEEDBACK_AREAS, FEEDBACK_STATUSES } from "@/lib/feedback-constants";
import { getAdminFeedback } from "@/lib/feedback";
import { requireAdminUser } from "@/lib/admin-stats";

type AdminFeedbackPageProps = {
  searchParams: Promise<{ status?: string; area?: string }>;
};

function parseStatus(value?: string): FeedbackStatus | undefined {
  if (!value) return undefined;
  return (FEEDBACK_STATUSES as readonly string[]).includes(value)
    ? (value as FeedbackStatus)
    : undefined;
}

function parseArea(value?: string): FeedbackArea | undefined {
  if (!value) return undefined;
  return (FEEDBACK_AREAS as readonly string[]).includes(value)
    ? (value as FeedbackArea)
    : undefined;
}

export default async function AdminFeedbackPage({
  searchParams,
}: AdminFeedbackPageProps) {
  await requireAdminUser();
  const { status: statusParam, area: areaParam } = await searchParams;

  const items = await getAdminFeedback({
    status: parseStatus(statusParam),
    area: parseArea(areaParam),
  });

  return (
    <section className="space-y-6">
      <PageHeader
        title="Feedback"
        subtitle="Product and development notes from trusted users."
        action={
          <Link href="/admin" className="ui-text-link">
            Admin
          </Link>
        }
      />

      <Suspense fallback={null}>
        <AdminFeedbackFilters />
      </Suspense>

      <AdminFeedbackList items={items} />
    </section>
  );
}
