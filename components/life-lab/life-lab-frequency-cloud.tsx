"use client";

import {
  frequencyCloudStyle,
  limitFrequencyCloudItems,
  parseFrequencyMarkdownList,
  type FrequencyCloudItem,
} from "@/lib/life-lab/frequency-cloud";

type LifeLabFrequencyCloudProps = {
  items?: FrequencyCloudItem[];
  content?: string;
  ariaLabel: string;
  maxItems?: number;
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
  items: itemsProp,
  content,
  ariaLabel,
  maxItems = 24,
  minFontSize = 14,
  maxFontSize = 28,
}: LifeLabFrequencyCloudProps) {
  const parsedItems =
    itemsProp ?? (content ? parseFrequencyMarkdownList(content) : []);
  const items = limitFrequencyCloudItems(parsedItems, maxItems);

  if (items.length === 0) {
    return null;
  }

  const minCount = items[items.length - 1]?.count ?? items[0]!.count;
  const maxCount = items[0]!.count;

  return (
    <div className="space-y-2">
      <div
        className="flex flex-wrap gap-x-4 gap-y-2.5"
        role="list"
        aria-label={ariaLabel}
      >
        {items.map((item) => {
          const style = frequencyCloudStyle(item.count, minCount, maxCount, {
            minFontSize,
            maxFontSize,
          });

          return (
            <span
              key={item.label}
              role="listitem"
              aria-label={`${item.label}, mentioned ${item.count} times`}
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
          <FrequencyCountList items={items} />
        </div>
      </details>
    </div>
  );
}
