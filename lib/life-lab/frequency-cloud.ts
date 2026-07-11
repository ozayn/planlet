export type FrequencyCloudItem = {
  label: string;
  count: number;
};

const FREQUENCY_LINE_PATTERN =
  /^[-*•]\s+(.+?)\s+(?:[—–-]|·)\s*(\d+)\s*$/;

export function parseFrequencyMarkdownList(content: string): FrequencyCloudItem[] {
  const items: FrequencyCloudItem[] = [];

  for (const line of content.split("\n")) {
    const match = line.trim().match(FREQUENCY_LINE_PATTERN);

    if (!match?.[1] || !match[2]) {
      continue;
    }

    items.push({
      label: match[1].trim(),
      count: Number.parseInt(match[2], 10),
    });
  }

  return items.sort(
    (left, right) =>
      right.count - left.count || left.label.localeCompare(right.label),
  );
}

export function frequencyCloudStyle(
  count: number,
  minCount: number,
  maxCount: number,
): {
  fontSize: string;
  fontWeight: number;
  opacity: number;
} {
  if (maxCount <= minCount) {
    return {
      fontSize: "0.875rem",
      fontWeight: 500,
      opacity: 0.8,
    };
  }

  const ratio = (count - minCount) / (maxCount - minCount);

  return {
    fontSize: `${0.75 + ratio * 0.625}rem`,
    fontWeight: ratio > 0.66 ? 600 : ratio > 0.33 ? 500 : 400,
    opacity: 0.55 + ratio * 0.45,
  };
}

export function limitFrequencyCloudItems(
  items: FrequencyCloudItem[],
  maxItems = 28,
): FrequencyCloudItem[] {
  return items.slice(0, maxItems);
}
