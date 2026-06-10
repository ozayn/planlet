"use client";

import type { FeedbackArea, FeedbackStatus } from "@/app/generated/prisma/client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import {
  FEEDBACK_AREAS,
  FEEDBACK_STATUSES,
} from "@/lib/feedback-constants";
import {
  getFeedbackAreaLabel,
  getFeedbackStatusLabel,
} from "@/lib/feedback-labels";

function buildHref(
  pathname: string,
  current: URLSearchParams,
  key: "status" | "area",
  value: string | null,
) {
  const params = new URLSearchParams(current.toString());

  if (!value) {
    params.delete(key);
  } else {
    params.set(key, value);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function AdminFeedbackFilters() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const area = searchParams.get("area");

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={buildHref(pathname, searchParams, "status", null)}
        className={`rounded-full px-3 py-1 text-xs ${
          !status
            ? "bg-accent-cream text-foreground"
            : "text-muted hover:bg-accent-cream/50"
        }`}
      >
        All statuses
      </Link>
      {FEEDBACK_STATUSES.map((value) => (
        <Link
          key={value}
          href={buildHref(pathname, searchParams, "status", value)}
          className={`rounded-full px-3 py-1 text-xs ${
            status === value
              ? "bg-accent-cream text-foreground"
              : "text-muted hover:bg-accent-cream/50"
          }`}
        >
          {getFeedbackStatusLabel(value)}
        </Link>
      ))}
      <span className="mx-1 w-px self-stretch bg-border-soft" aria-hidden="true" />
      <Link
        href={buildHref(pathname, searchParams, "area", null)}
        className={`rounded-full px-3 py-1 text-xs ${
          !area
            ? "bg-accent-cream text-foreground"
            : "text-muted hover:bg-accent-cream/50"
        }`}
      >
        All areas
      </Link>
      {FEEDBACK_AREAS.map((value) => (
        <Link
          key={value}
          href={buildHref(pathname, searchParams, "area", value)}
          className={`rounded-full px-3 py-1 text-xs ${
            area === value
              ? "bg-accent-cream text-foreground"
              : "text-muted hover:bg-accent-cream/50"
          }`}
        >
          {getFeedbackAreaLabel(value)}
        </Link>
      ))}
    </div>
  );
}
