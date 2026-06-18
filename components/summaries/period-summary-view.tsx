"use client";

import Link from "next/link";
import { useState } from "react";

import { SummaryCard } from "@/components/insights/summary-card";
import { getObservationCategoryLabel } from "@/lib/observation-labels";
import type {
  PeriodSummary,
  PeriodSummaryIncludedPlan,
  PeriodSummaryItem,
  PeriodSummaryItemTier,
} from "@/lib/period-summary-types";
import {
  periodSummaryIntro,
  periodSummaryItemMeta,
  periodSummaryOpenPlanLabel,
} from "@/lib/period-summary-types";

type PeriodSummaryViewProps = {
  summary: PeriodSummary;
};

function ItemList({
  items,
  emptyLabel,
}: {
  items: PeriodSummaryItem[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return emptyLabel ? (
      <p className="text-sm text-muted">{emptyLabel}</p>
    ) : null;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-xl border border-border-soft bg-surface px-3 py-2.5"
        >
          <p className="text-sm text-foreground" dir="auto">
            {item.title}
          </p>
          <p className="mt-0.5 text-xs text-muted-light">
            {periodSummaryItemMeta(item)}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

const INCLUDED_PLAN_TIER_ORDER: PeriodSummaryItemTier[] = [
  "period",
  "monthly",
  "weekly",
  "daily",
];

function groupIncludedPlans(
  plans: PeriodSummaryIncludedPlan[],
  periodPlan: PeriodSummary["periodPlan"],
  periodPlanHref: string,
  periodType: PeriodSummary["periodType"],
): Array<{ tierLabel: string; plans: PeriodSummaryIncludedPlan[] }> {
  const tiers = new Map<PeriodSummaryItemTier, PeriodSummaryIncludedPlan[]>();

  if (periodPlan) {
    tiers.set("period", [
      {
        id: periodPlan.id,
        title: periodPlan.title,
        type: periodPlan.type,
        href: periodPlanHref,
        groupLabel:
          periodType === "WEEK"
            ? "Weekly plan"
            : periodType === "MONTH"
              ? "Monthly plan"
              : "Yearly plan",
        tier: "period",
      },
    ]);
  }

  for (const plan of plans) {
    const existing = tiers.get(plan.tier) ?? [];
    existing.push(plan);
    tiers.set(plan.tier, existing);
  }

  return INCLUDED_PLAN_TIER_ORDER.flatMap((tier) => {
    const tierPlans = tiers.get(tier);
    if (!tierPlans || tierPlans.length === 0) {
      return [];
    }

    const tierLabel =
      tier === "period"
        ? periodType === "WEEK"
          ? "Weekly plan"
          : periodType === "MONTH"
            ? "Monthly plan"
            : "Yearly plan"
        : tier === "monthly"
          ? "Monthly plans"
          : tier === "weekly"
            ? "Weekly plans"
            : "Daily plans";

    return [{ tierLabel, plans: tierPlans }];
  });
}

export function PeriodSummaryView({ summary }: PeriodSummaryViewProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  async function handleCopy() {
    setCopied(false);
    setCopyError(false);

    try {
      await navigator.clipboard.writeText(summary.copyText);
      setCopied(true);
    } catch {
      setCopyError(true);
    }
  }

  if (!summary.hasAnyPlans) {
    return (
      <div className="ui-empty-state space-y-4">
        <p className="text-sm text-muted">No plans for this period yet.</p>
        <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Link href={summary.periodPlanHref} className="ui-btn-secondary">
            {periodSummaryOpenPlanLabel(summary.periodType)}
          </Link>
          <Link href="/plans/new" className="ui-btn-secondary">
            New plan
          </Link>
          <Link href="/plans" className="ui-btn-secondary">
            Plan a date
          </Link>
        </div>
      </div>
    );
  }

  const includedPlanGroups = groupIncludedPlans(
    summary.includedPlans,
    summary.periodPlan,
    summary.periodPlanHref,
    summary.periodType,
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {periodSummaryIntro(summary.periodType)}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="ui-btn-secondary shrink-0"
        >
          Copy summary
        </button>
      </div>

      {copied ? (
        <p className="text-sm text-muted">Summary copied.</p>
      ) : null}
      {copyError ? (
        <p className="text-sm text-accent-red">Could not copy. Try again.</p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">At a glance</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <SummaryCard
            label="Plans included"
            value={summary.atAGlance.plansIncluded}
            accent="blue"
          />
          <SummaryCard
            label="Completed"
            value={summary.atAGlance.itemsCompleted}
            accent="blue"
          />
          <SummaryCard
            label="Still open"
            value={summary.atAGlance.stillOpen}
            accent="yellow"
          />
          <SummaryCard
            label="Moved/skipped"
            value={summary.atAGlance.movedSkipped}
            accent="yellow"
          />
          <SummaryCard
            label="Intentions"
            value={summary.atAGlance.intentions}
            accent="blue"
          />
          <SummaryCard
            label="Reflections"
            value={summary.atAGlance.notes}
            accent="blue"
          />
        </div>
      </section>

      {summary.completed.length > 0 ? (
        <Section title="Completed">
          <div className="space-y-5">
            {summary.completed.map((tier) => (
              <div key={tier.tier} className="space-y-3">
                <h3 className="text-xs font-medium uppercase tracking-[0.08em] text-muted-light">
                  {tier.tierLabel}
                </h3>
                <div className="space-y-4">
                  {tier.groups.map((group) => (
                    <div key={group.label} className="space-y-2">
                      <h4 className="text-sm font-medium text-muted">
                        {group.label}
                      </h4>
                      <ItemList items={group.items} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {summary.stillOpen.length > 0 ? (
        <Section title="Still open">
          <p className="text-sm text-muted">
            Items you might want to carry forward or revisit.
          </p>
          <ItemList items={summary.stillOpen} />
        </Section>
      ) : null}

      {summary.notDone.length > 0 ? (
        <Section title="Not done">
          <p className="text-sm text-muted">
            Items that did not get done this period.
          </p>
          <ItemList items={summary.notDone} />
        </Section>
      ) : null}

      {summary.moved.length > 0 ||
      summary.skipped.length > 0 ||
      summary.released.length > 0 ? (
        <Section title="Moved, skipped, released">
          <ItemList
            items={[...summary.moved, ...summary.skipped, ...summary.released]}
          />
        </Section>
      ) : null}

      {summary.intentions.length > 0 ? (
        <Section title="Intentions">
          {summary.repeatedThemes.length > 0 ? (
            <p className="text-sm text-muted">
              Themes that came up more than once:{" "}
              {summary.repeatedThemes.join(", ")}
            </p>
          ) : null}
          <ItemList items={summary.intentions} />
        </Section>
      ) : null}

      {summary.notes.length > 0 ? (
        <Section title="Notes & reflections">
          <ItemList items={summary.notes} />
        </Section>
      ) : null}

      {summary.observations.length > 0 ? (
        <Section title="Private observations">
          <p className="text-xs text-muted-light">
            Only you can see these. Not shared or exported.
          </p>
          <div className="space-y-4">
            {summary.observationsByCategory.map((group) => (
              <div key={group.category} className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-[0.08em] text-muted-light">
                  {getObservationCategoryLabel(group.category)}
                </h3>
                <ul className="space-y-2">
                  {group.items.map((observation) => (
                    <li
                      key={observation.id}
                      className="rounded-xl border border-border-soft/80 bg-surface/60 px-3 py-2.5"
                    >
                      <p className="text-sm text-foreground" dir="auto">
                        <span className="text-muted-light">
                          {group.categoryLabel}
                        </span>
                        <span className="text-muted-light"> · </span>
                        <span className="whitespace-pre-wrap">
                          {observation.body}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-light">
                        {observation.planGroupLabel}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {summary.gratitudes.length > 0 ? (
        <Section title="Gratitude">
          <p className="text-xs text-muted-light">
            Only you can see these. Not shared or exported.
          </p>
          <ul className="space-y-2">
            {summary.gratitudes.map((gratitude) => (
              <li
                key={gratitude.id}
                className="rounded-xl border border-border-soft/80 bg-surface/60 px-3 py-2.5"
              >
                <p className="whitespace-pre-wrap text-sm text-foreground" dir="auto">
                  {gratitude.body}
                </p>
                <p className="mt-0.5 text-xs text-muted-light">
                  {gratitude.planGroupLabel}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {includedPlanGroups.length > 0 ? (
        <Section title="Included plans">
          <div className="space-y-4">
            {includedPlanGroups.map((group) => (
              <div key={group.tierLabel} className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-[0.08em] text-muted-light">
                  {group.tierLabel}
                </h3>
                <ul className="space-y-2">
                  {group.plans.map((plan) => (
                    <li key={plan.id}>
                      <Link
                        href={plan.href}
                        className="ui-card flex items-center justify-between gap-3 px-3 py-2 transition-colors hover:bg-accent-cream/40"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {plan.groupLabel}
                          </p>
                          <p
                            className="truncate text-xs text-muted"
                            dir="auto"
                          >
                            {plan.title}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-light">
                          Open
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {!summary.hasAnyContent ? (
        <p className="text-sm text-muted">
          You have plans for this period, but no items yet. Add a few tasks or
          reflections to see them here.
        </p>
      ) : null}
    </div>
  );
}
