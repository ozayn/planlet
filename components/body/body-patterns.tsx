"use client";

import type { BodyJourneyPatterns } from "@/lib/body-journey/constants";
import { BODY_SYMPTOM_META } from "@/lib/body-journey-types";

type BodyPatternsProps = {
  patterns: BodyJourneyPatterns;
};

function StatRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-medium text-foreground">{value}</span>
      </div>
    </div>
  );
}

export function BodyPatterns({ patterns }: BodyPatternsProps) {
  const mostCommonLabel = patterns.mostCommonSymptom
    ? BODY_SYMPTOM_META[patterns.mostCommonSymptom].label
    : "—";

  const averageLabel =
    patterns.averageIntensity != null
      ? `${patterns.averageIntensity}/10`
      : "—";

  const maxCount = Math.max(
    ...patterns.symptomCounts.map((item) => item.count),
    1,
  );

  return (
    <section className="ui-card-padded space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Patterns</h2>

      <div className="space-y-3">
        <StatRow label="Most common symptom" value={mostCommonLabel} />
        <StatRow label="Average intensity" value={averageLabel} />
        <StatRow
          label="Days tracked this month"
          value={String(patterns.daysTrackedThisMonth)}
        />
      </div>

      {patterns.symptomCounts.length > 0 ? (
        <ul className="space-y-3 border-t border-border-soft pt-4">
          {patterns.symptomCounts.map((item) => {
            const meta = BODY_SYMPTOM_META[item.type];

            return (
              <li key={item.type}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="text-foreground">{meta.label}</span>
                  <span className="text-muted-light">{item.count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-border-soft">
                  <div
                    className="h-full rounded-full opacity-70"
                    style={{
                      width: `${(item.count / maxCount) * 100}%`,
                      backgroundColor: meta.color,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
