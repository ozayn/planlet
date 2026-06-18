"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createDayPlanForDateAction,
  createTodayPlanAction,
} from "@/app/(app)/plans/actions";
import {
  formatDateString,
  formatMonthStartString,
  formatWeekStartString,
  formatYearStartString,
} from "@/lib/dates";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

export function PlanOpenSection() {
  const router = useRouter();
  const now = new Date();
  const today = formatDateString(now);
  const weekStart = formatWeekStartString(now);
  const monthStart = formatMonthStartString(now);
  const yearStart = formatYearStartString(now);
  const [date, setDate] = useState(today);
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    if (!date) {
      return;
    }

    startTransition(async () => {
      if (date === today) {
        await createTodayPlanAction();
        router.push("/today");
        return;
      }

      await createDayPlanForDateAction(date);
    });
  }

  const quickLinks = [
    { href: "/today", label: "Today" },
    { href: `/plans/week/${weekStart}`, label: "This week" },
    { href: `/plans/month/${monthStart}`, label: "This month" },
    { href: `/plans/year/${yearStart}`, label: "This year" },
  ] as const;

  return (
    <section className="ui-plans-open space-y-2">
      <h2 className="text-sm font-medium text-foreground">Open plan</h2>
      <div className="flex items-center gap-2">
        <input
          id="plan-open-date"
          name="planOpenDate"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          {...passwordManagerSafeControlProps}
          className="ui-input ui-input-compact min-h-10 min-w-0 flex-1"
          aria-label="Plan date"
        />
        <button
          type="button"
          onClick={handleOpen}
          disabled={!date || isPending}
          {...passwordManagerSafeControlProps}
          className="ui-btn-secondary ui-btn-compact min-h-10 shrink-0 px-4"
        >
          {isPending ? "Opening…" : "Open"}
        </button>
      </div>
      <nav
        className="flex flex-wrap items-center gap-x-3 gap-y-1"
        aria-label="Open current period"
      >
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-xs text-muted transition-colors hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </section>
  );
}
