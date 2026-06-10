import type { PlanType } from "@/app/generated/prisma/client";

import { formatPlanListRowDate } from "@/lib/dates";
import { formatCompactActivityTime } from "@/lib/plan-activity";

export function formatPlanListMetaLine({
  type,
  dateStart,
  dateEnd,
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

  if (type === "MONTH" || type === "YEAR") {
    return `${items} · ${activity}`;
  }

  const date = formatPlanListRowDate({ type, dateStart, dateEnd });
  return `${date} · ${items} · ${activity}`;
}

export function formatSharedPlanSubline({
  ownerName,
  ownerEmail,
  type,
  dateStart,
  dateEnd,
}: {
  ownerName: string | null;
  ownerEmail: string | null;
  type: PlanType;
  dateStart: Date;
  dateEnd: Date;
}): string {
  const owner = formatShortOwnerName(ownerName, ownerEmail);
  const date = formatPlanListRowDate({ type, dateStart, dateEnd });
  return `From ${owner} · ${date}`;
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
