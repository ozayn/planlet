import { getPlanItemTypeLabel } from "@/lib/plan-labels";
import { getMonthlyInsights } from "@/lib/insights";
import { getPeriodSummary } from "@/lib/period-summary";
import type { UserAccess } from "@/lib/roles";
import {
  canUseCoachingFeatures,
  canUseReflectionFeatures,
  canUseTherapyThoughts,
} from "@/lib/roles";

const MAX_ITEM_SAMPLES = 6;

function sampleTitles(
  items: Array<{ title: string }>,
  limit = MAX_ITEM_SAMPLES,
): string {
  return items
    .map((item) => item.title.trim())
    .filter(Boolean)
    .slice(0, limit)
    .join("; ");
}

export async function buildCoachingReflectionContext(
  userId: string,
  access: UserAccess,
): Promise<string> {
  const now = new Date();
  const insights = await getMonthlyInsights(userId, now, access);
  const lines: string[] = [
    `Month: ${insights.dateLabel}`,
    `Plans: ${insights.totals.plans}`,
    `Items: ${insights.totals.items}`,
    `Completed: ${insights.totals.done}`,
    `Partial: ${insights.totals.partial}`,
    `Not done: ${insights.totals.notDone}`,
    `Moved: ${insights.totals.moved}`,
    `Released: ${insights.totals.released}`,
    `Skipped: ${insights.totals.skipped}`,
    `Open: ${insights.totals.open}`,
  ];

  if (insights.intentions.length > 0) {
    lines.push(
      `Intentions: ${insights.intentions
        .slice(0, 8)
        .map((entry) => entry.title)
        .join("; ")}`,
    );
  }

  if (insights.oftenMovedTypes.length > 0) {
    lines.push(
      `Often moved item types: ${insights.oftenMovedTypes
        .map(
          (entry) =>
            `${getPlanItemTypeLabel(entry.type)} (${entry.count})`,
        )
        .join(", ")}`,
    );
  }

  const { priorityQuadrants } = insights;
  if (
    priorityQuadrants.doSoon +
      priorityQuadrants.protectTime +
      priorityQuadrants.contain +
      priorityQuadrants.maybeRelease +
      priorityQuadrants.unclassified >
    0
  ) {
    lines.push(
      `Priority spread: do soon ${priorityQuadrants.doSoon}, protect time ${priorityQuadrants.protectTime}, contain ${priorityQuadrants.contain}, maybe release ${priorityQuadrants.maybeRelease}, unclassified ${priorityQuadrants.unclassified}`,
    );
  }

  if (canUseReflectionFeatures(access)) {
    if (insights.observationCategories.length > 0) {
      lines.push(
        `Observation categories: ${insights.observationCategories
          .map((entry) => `${entry.label} (${entry.count})`)
          .join(", ")}`,
      );
    }

    if (insights.recentObservations.length > 0) {
      lines.push(
        `Recent observations: ${insights.recentObservations
          .slice(0, 5)
          .map((entry) => entry.body)
          .join("; ")}`,
      );
    }
  }

  if (
    canUseCoachingFeatures(access) &&
    canUseTherapyThoughts(access) &&
    insights.therapyThoughts &&
    insights.therapyThoughts.recent.length > 0
  ) {
    lines.push(
      `Recent therapy thoughts: ${insights.therapyThoughts.recent
        .slice(0, 3)
        .map((entry) => entry.body)
        .join("; ")}`,
    );
  }

  const monthSummary = await getPeriodSummary(userId, "MONTH", now);

  const completedSample = sampleTitles(
    monthSummary.completed.flatMap((tier) =>
      tier.groups.flatMap((group) => group.items),
    ),
  );
  if (completedSample) {
    lines.push(`Completed tasks (sample): ${completedSample}`);
  }

  const openSample = sampleTitles(
    monthSummary.stillOpen.filter((item) => item.status === "OPEN"),
  );
  if (openSample) {
    lines.push(`Open tasks (sample): ${openSample}`);
  }

  const partialSample = sampleTitles(
    monthSummary.stillOpen.filter((item) => item.status === "PARTIAL"),
  );
  if (partialSample) {
    lines.push(`Partial tasks (sample): ${partialSample}`);
  }

  const notDoneSample = sampleTitles(monthSummary.notDone);
  if (notDoneSample) {
    lines.push(`Not done tasks (sample): ${notDoneSample}`);
  }

  const movedSample = sampleTitles(monthSummary.moved);
  if (movedSample) {
    lines.push(`Moved tasks (sample): ${movedSample}`);
  }

  const releasedSample = sampleTitles(monthSummary.released);
  if (releasedSample) {
    lines.push(`Released tasks (sample): ${releasedSample}`);
  }

  const skippedSample = sampleTitles(monthSummary.skipped);
  if (skippedSample) {
    lines.push(`Skipped tasks (sample): ${skippedSample}`);
  }

  if (canUseReflectionFeatures(access) && monthSummary.gratitudes.length > 0) {
    lines.push(
      `Gratitude (sample): ${monthSummary.gratitudes
        .slice(0, 5)
        .map((entry) => entry.body.trim())
        .filter(Boolean)
        .join("; ")}`,
    );
  }

  if (monthSummary.repeatedThemes.length > 0) {
    lines.push(
      `Repeated intention themes: ${monthSummary.repeatedThemes.join("; ")}`,
    );
  }

  try {
    const [weekSummary, yearSummary] = await Promise.all([
      getPeriodSummary(userId, "WEEK", now),
      getPeriodSummary(userId, "YEAR", now),
    ]);

    lines.push(
      `Week at a glance: ${weekSummary.atAGlance.itemsCompleted} completed, ${weekSummary.atAGlance.stillOpen} open, ${weekSummary.atAGlance.movedSkipped} moved/skipped`,
      `Year at a glance: ${yearSummary.atAGlance.itemsCompleted} completed, ${yearSummary.atAGlance.stillOpen} open, ${yearSummary.atAGlance.movedSkipped} moved/skipped`,
    );
  } catch {
    // Period summaries are best-effort context.
  }

  return lines.join("\n");
}
