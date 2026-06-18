import type { UserAccess } from "@/lib/roles";
import {
  canUseCoachingFeatures,
  canUseReflectionFeatures,
  canUseTherapyThoughts,
} from "@/lib/roles";
import { getMonthlyInsights } from "@/lib/insights";

export async function buildCoachingReflectionContext(
  userId: string,
  access: UserAccess,
): Promise<string> {
  const insights = await getMonthlyInsights(userId, new Date(), access);
  const lines: string[] = [
    `Month: ${insights.dateLabel}`,
    `Plans: ${insights.totals.plans}`,
    `Items: ${insights.totals.items}`,
    `Completed: ${insights.totals.done}`,
    `Partial: ${insights.totals.partial}`,
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

  return lines.join("\n");
}
