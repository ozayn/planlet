import type { PlanType } from "@/app/generated/prisma/client";

import { formatCompactActivityTime } from "@/lib/plan-activity";

export function formatPlanListMetaLine({
  itemCount,
  updatedAt,
}: {
  type: PlanType;
  dateStart: Date;
  dateEnd: Date;
  itemCount: number;
  updatedAt: Date;
}): string {
  const items = `${itemCount} item${itemCount === 1 ? "" : "s"}`;
  const activity = formatCompactActivityTime(updatedAt);
  return `${items} · ${activity}`;
}

export function formatSharedPlanSubline({
  ownerName,
  ownerEmail,
  itemCount,
}: {
  ownerName: string | null;
  ownerEmail: string | null;
  type: PlanType;
  dateStart: Date;
  dateEnd: Date;
  itemCount: number;
}): string {
  const owner = formatShortOwnerName(ownerName, ownerEmail);
  const items = `${itemCount} item${itemCount === 1 ? "" : "s"}`;
  return `From ${owner} · ${items}`;
}

function formatShortOwnerName(
  name: string | null,
  email: string | null,
): string {
  const trimmed = name?.trim();
  if (trimmed) {
    return trimmed.split(/\s+/)[0] ?? trimmed;
  }

  if (email) {
    const local = email.split("@")[0];
    return local || "User";
  }

  return "User";
}
