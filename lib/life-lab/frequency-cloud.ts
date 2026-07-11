export type FrequencyCloudItem = {
  label: string;
  count: number;
};

const TECHNICAL_LABELS = new Set([
  "concept",
  "concepts",
  "people",
  "person",
  "count",
  "counts",
  "frequency",
  "frequencies",
  "mentions",
  "mention",
  "rank",
  "term",
  "terms",
  "name",
  "names",
  "#",
]);

const FREQUENCY_PATTERNS = [
  /^[-*•]\s+(.+?)\s+(?:[—–-]|·)\s*(\d+)\s*$/,
  /^[-*•]\s+(.+?)\s*:\s*(\d+)\s*$/,
  /^\d+\.\s+(.+?)\s+(?:[—–-]|·|:)\s*(\d+)\s*$/,
  /^(.+?)\s+(?:[—–-]|·)\s*(\d+)\s*$/,
] as const;

function isTechnicalLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase();

  if (!normalized || TECHNICAL_LABELS.has(normalized)) {
    return true;
  }

  if (!/[A-Za-z0-9]/.test(normalized)) {
    return true;
  }

  return /^:?-{3,}:?$/.test(normalized);
}

function parseFrequencyLine(line: string): FrequencyCloudItem | null {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("```")) {
    return null;
  }

  if (/^\|/.test(trimmed)) {
    const cells = trimmed
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);

    if (cells.length < 2) {
      return null;
    }

    const label = cells[0] ?? "";
    const count = Number.parseInt(cells[cells.length - 1] ?? "", 10);

    if (isTechnicalLabel(label) || !Number.isFinite(count) || count <= 0) {
      return null;
    }

    return { label: label.trim(), count };
  }

  for (const pattern of FREQUENCY_PATTERNS) {
    const match = trimmed.match(pattern);

    if (!match?.[1] || !match[2]) {
      continue;
    }

    const label = match[1].trim();
    const count = Number.parseInt(match[2], 10);

    if (isTechnicalLabel(label) || !Number.isFinite(count) || count <= 0) {
      return null;
    }

    return { label, count };
  }

  return null;
}

export function mergeFrequencyCloudItems(
  items: FrequencyCloudItem[],
): FrequencyCloudItem[] {
  const merged = new Map<string, FrequencyCloudItem>();

  for (const item of items) {
    const key = item.label.trim().toLowerCase();
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, item);
      continue;
    }

    merged.set(key, {
      label: item.count >= existing.count ? item.label : existing.label,
      count: existing.count + item.count,
    });
  }

  return [...merged.values()].sort(
    (left, right) =>
      right.count - left.count || left.label.localeCompare(right.label),
  );
}

export function parseFrequencyMarkdownList(content: string): FrequencyCloudItem[] {
  const items: FrequencyCloudItem[] = [];

  for (const line of content.replace(/<!--[\s\S]*?-->/g, "").split("\n")) {
    const parsed = parseFrequencyLine(line);

    if (parsed) {
      items.push(parsed);
    }
  }

  return mergeFrequencyCloudItems(items);
}

export function frequencyCloudStyle(
  count: number,
  minCount: number,
  maxCount: number,
  options: { minFontSize?: number; maxFontSize?: number } = {},
): {
  fontSize: string;
  fontWeight: number;
  opacity: number;
} {
  const minPx = options.minFontSize ?? 14;
  const maxPx = options.maxFontSize ?? 28;

  if (itemsSpanEqual(minCount, maxCount)) {
    const size = (minPx + maxPx) / 2;

    return {
      fontSize: `${size}px`,
      fontWeight: 500,
      opacity: 0.85,
    };
  }

  const sqrt = (value: number) => Math.sqrt(Math.max(value, 0));
  const ratio =
    (sqrt(count) - sqrt(minCount)) / (sqrt(maxCount) - sqrt(minCount));
  const clamped = Math.min(1, Math.max(0, ratio));
  const fontSize = minPx + clamped * (maxPx - minPx);

  return {
    fontSize: `${fontSize}px`,
    fontWeight: clamped > 0.66 ? 600 : clamped > 0.33 ? 500 : 400,
    opacity: 0.55 + clamped * 0.45,
  };
}

function itemsSpanEqual(minCount: number, maxCount: number): boolean {
  return maxCount <= minCount || maxCount <= 0;
}

export function limitFrequencyCloudItems(
  items: FrequencyCloudItem[],
  maxItems = 28,
): FrequencyCloudItem[] {
  return items.slice(0, maxItems);
}
