export const BODY_JOURNEY_PERIODS = ["TODAY", "WEEK", "MONTH"] as const;

export type BodyJourneyPeriodValue =
  (typeof BODY_JOURNEY_PERIODS)[number];

export const BODY_JOURNEY_PERIOD_LABELS: Record<BodyJourneyPeriodValue, string> = {
  TODAY: "Today",
  WEEK: "Week",
  MONTH: "Month",
};

export function isBodyJourneyPeriod(
  value: string,
): value is BodyJourneyPeriodValue {
  return (BODY_JOURNEY_PERIODS as readonly string[]).includes(value);
}

export function parseBodyJourneyPeriod(
  value: string | undefined,
): BodyJourneyPeriodValue {
  const normalized = value?.trim().toUpperCase();
  if (normalized && isBodyJourneyPeriod(normalized)) {
    return normalized;
  }

  if (value === "week") {
    return "WEEK";
  }

  if (value === "month") {
    return "MONTH";
  }

  return "TODAY";
}
