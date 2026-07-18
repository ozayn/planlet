export type LifeLabTimelineItem = {
  timestamp: string;
  description: string;
};

function cleanCell(value: string): string {
  return value
    .trim()
    .replace(/^\*\*|\*\*$/g, "")
    .replace(/^`|`$/g, "")
    .trim();
}

function parseTableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(
    line,
  );
}

function isTimelineHeader(cells: string[]): boolean {
  const first = cleanCell(cells[0] ?? "").toLowerCase();
  const second = cleanCell(cells[1] ?? "").toLowerCase();

  return (
    ["time", "timestamp"].includes(first) &&
    ["moment", "event", "description", "topic", "note"].includes(second)
  );
}

function parseTimelineTable(content: string): LifeLabTimelineItem[] {
  const lines = content.split("\n").filter((line) => line.trim().startsWith("|"));
  const rows = lines
    .filter((line) => !isTableSeparator(line))
    .map(parseTableCells);

  if (rows.length === 0) {
    return [];
  }

  const body = isTimelineHeader(rows[0] ?? []) ? rows.slice(1) : rows;

  return body.flatMap((cells) => {
    const timestamp = cleanCell(cells[0] ?? "");
    const description = cells.slice(1).join(" | ").trim();

    return isTimelineTimestamp(timestamp) && description
      ? [{ timestamp, description }]
      : [];
  });
}

function parseTimelineLines(content: string): LifeLabTimelineItem[] {
  return content.split("\n").flatMap((line) => {
    const match = line.match(
      /^\s*(?:[-*+]\s+|\d+[.)]\s+)?(?:\*\*)?(\d{1,3}:\d{2}(?::\d{2})?)(?:\*\*)?\s*(?:[-–—:]\s*)?(.+?)\s*$/,
    );

    if (!match) {
      return [];
    }

    const timestamp = match[1] ?? "";
    const description = match[2]?.trim() ?? "";

    return description ? [{ timestamp, description }] : [];
  });
}

export function isTimelineTimestamp(value: string): boolean {
  return /^\d{1,3}:\d{2}(?::\d{2})?$/.test(value.trim());
}

export function parseLifeLabTimeline(content: string): LifeLabTimelineItem[] {
  const tableItems = parseTimelineTable(content);
  return tableItems.length > 0 ? tableItems : parseTimelineLines(content);
}

const SMALL_NUMBERS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
] as const;

const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
] as const;

function numberToWords(value: number): string {
  if (value < 20) {
    return SMALL_NUMBERS[value] ?? String(value);
  }

  if (value < 60) {
    const tens = TENS[Math.floor(value / 10)] ?? String(value);
    const ones = value % 10;
    return ones ? `${tens}-${SMALL_NUMBERS[ones]}` : tens;
  }

  return String(value);
}

function unit(value: number, singular: string): string {
  return `${numberToWords(value)} ${value === 1 ? singular : `${singular}s`}`;
}

export function timelineTimestampToSpeech(timestamp: string): string {
  const values = timestamp.split(":").map(Number);

  if (values.some((value) => !Number.isFinite(value))) {
    return timestamp;
  }

  if (values.length === 2) {
    const [minutes = 0, seconds = 0] = values;
    const parts = [unit(minutes, "minute")];

    if (seconds > 0) {
      parts.push(unit(seconds, "second"));
    }

    const spoken = parts.join(", ");
    return `${spoken.charAt(0).toUpperCase()}${spoken.slice(1)}.`;
  }

  const [hours = 0, minutes = 0, seconds = 0] = values;
  const parts = [unit(hours, "hour")];

  if (minutes > 0) {
    parts.push(unit(minutes, "minute"));
  }

  if (seconds > 0) {
    parts.push(unit(seconds, "second"));
  }

  const spoken = parts.join(", ");
  return `${spoken.charAt(0).toUpperCase()}${spoken.slice(1)}.`;
}
