"use client";

import {
  frequencyCloudStyle,
  type FrequencyCloudItem,
} from "@/lib/life-lab/frequency-cloud";
import { useDensityTokenNumber } from "@/lib/use-density-token";

export type FrequencyCloudDisplayItem = FrequencyCloudItem & {
  weight?: number;
  rawCount?: number;
};

type LifeLabFrequencyCloudProps = {
  items: FrequencyCloudDisplayItem[];
  countItems?: FrequencyCloudItem[];
  ariaLabel: string;
  minFontSize?: number;
  maxFontSize?: number;
};

function FrequencyCountList({ items }: { items: FrequencyCloudItem[] }) {
  return (
    <ul className="space-y-1 text-sm text-muted">
      {items.map((item) => (
        <li key={item.label}>
          {item.label} — {item.count}
        </li>
      ))}
    </ul>
  );
}

export function LifeLabFrequencyCloud({
  items,
  countItems,
  ariaLabel,
  minFontSize,
  maxFontSize,
}: LifeLabFrequencyCloudProps) {
  const densityCloudMin = useDensityTokenNumber("--density-cloud-min", 14);
  const densityCloudMax = useDensityTokenNumber("--density-cloud-max", 28);
  const resolvedMinFontSize = minFontSize ?? densityCloudMin;
  const resolvedMaxFontSize = maxFontSize ?? densityCloudMax;

  if (items.length === 0) {
    return null;
  }

  const weights = items.map((item) => item.weight ?? item.count);
  const minWeight = weights[weights.length - 1] ?? weights[0] ?? 0;
  const maxWeight = weights[0] ?? 0;
  const counts = countItems ?? items.map((item) => ({
    label: item.label,
    count: item.rawCount ?? item.count,
  }));

  return (
    <div className="ui-life-lab-surface space-y-2">
      <div
        className="flex flex-wrap gap-x-4 gap-y-2.5"
        role="list"
        aria-label={ariaLabel}
      >
        {items.map((item) => {
          const sizingCount = item.weight ?? item.count;
          const mentionCount = item.rawCount ?? item.count;
          const style = frequencyCloudStyle(
            sizingCount,
            minWeight,
            maxWeight,
            {
              minFontSize: resolvedMinFontSize,
              maxFontSize: resolvedMaxFontSize,
            },
          );

          return (
            <span
              key={item.label}
              role="listitem"
              aria-label={`${item.label}, mentioned ${mentionCount} times`}
              className="leading-snug text-foreground"
              style={{
                fontSize: style.fontSize,
                fontWeight: style.fontWeight,
                opacity: style.opacity,
              }}
            >
              {item.label}
            </span>
          );
        })}
      </div>
      <details className="ui-settings-details group">
        <summary className="ui-settings-details-summary !text-sm !normal-case !tracking-normal">
          View counts
        </summary>
        <div className="ui-settings-details-body">
          <FrequencyCountList items={counts} />
        </div>
      </details>
    </div>
  );
}
