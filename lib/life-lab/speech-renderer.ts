import type { LifeLabNoteMetadata } from "@/lib/life-lab/constants";
import { suppressExactHeaderMetadataLines } from "@/lib/life-lab/note-quality";
import {
  isTimelineTimestamp,
  timelineTimestampToSpeech,
} from "@/lib/life-lab/timeline";

export type LifeLabSpeechDisclosure = {
  id: string;
  markdown: string;
  expanded: boolean;
};

const PRESENTATION_LABELS = [
  "role in the episode",
  "meaning",
  "context",
  "why it is useful",
  "publication date",
  "date",
  "duration",
  "transcript source",
  "transcription method",
  "study status",
  "platform",
  "show",
] as const;

const PRESENTATION_LABEL_SET = new Set<string>(PRESENTATION_LABELS);
const MERMAID_BLOCK_PATTERN = /```mermaid[\s\S]*?```/gi;

function normalizeLabel(value: string): string {
  return value
    .replace(/[*_`~]/g, "")
    .replace(/[:#]+$/, "")
    .replace(/^(?:section\s+)?\d+(?:[.)]|\s*[-:])\s*/i, "")
    .trim()
    .toLowerCase();
}

export function isLifeLabSpeechPresentationLabel(value: string): boolean {
  return PRESENTATION_LABEL_SET.has(normalizeLabel(value));
}

function headingTitle(markdown: string): string | null {
  return markdown.match(/^#{1,6}\s+(.+?)\s*$/m)?.[1]?.trim() ?? null;
}

function removeHeadingSection(content: string, title: string): string {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const heading = new RegExp(`^##\\s+${escaped}\\s*$`, "im");
  const match = content.match(heading);

  if (!match || match.index === undefined) {
    return content;
  }

  const rest = content.slice(match.index + match[0].length);
  const next = rest.search(/^##\s+/m);
  const end =
    next === -1
      ? content.length
      : match.index + match[0].length + next;

  return `${content.slice(0, match.index)}${content.slice(end)}`
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function hasHeadingSection(content: string, title: string): boolean {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^##\\s+${escaped}\\s*$`, "im").test(content);
}

export function applyLifeLabSpeechDisclosureVisibility(
  content: string,
  disclosures: LifeLabSpeechDisclosure[] = [],
): string {
  let visible = content;

  for (const disclosure of disclosures) {
    const markdown = disclosure.markdown.trim();

    if (!markdown) {
      continue;
    }

    if (visible.includes(markdown)) {
      if (!disclosure.expanded) {
        visible = visible.replace(markdown, "");
      }

      continue;
    }

    const title = headingTitle(markdown);

    if (!disclosure.expanded && title) {
      visible = removeHeadingSection(visible, title);
    } else if (disclosure.expanded && title && hasHeadingSection(visible, title)) {
      continue;
    } else if (disclosure.expanded) {
      visible = `${visible.trim()}\n\n${markdown}`.trim();
    }
  }

  return visible.replace(/\n{3,}/g, "\n\n").trim();
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

function transformPresentationTable(rows: string[]): string[] {
  const parsed = rows.filter((row) => !isTableSeparator(row)).map(parseTableCells);
  const body = parsed.slice(1);
  const firstHeader = normalizeLabel(parsed[0]?.[0] ?? "");
  const secondHeader = normalizeLabel(parsed[0]?.[1] ?? "");
  const isTimelineTable =
    ["time", "timestamp"].includes(firstHeader) &&
    ["moment", "event", "description", "topic", "note"].includes(secondHeader);

  if (isTimelineTable) {
    return body.flatMap((cells) => {
      const timestamp = (cells[0] ?? "")
        .replace(/[*_`~]/g, "")
        .trim();
      const description = cells.slice(1).join(" ").trim();

      return isTimelineTimestamp(timestamp) && description
        ? [`- ${timelineTimestampToSpeech(timestamp)} ${description}`]
        : [];
    });
  }

  const isLabelValueTable =
    parsed[0]?.length === 2 &&
    body.length > 0 &&
    body.every(
      (cells) =>
        cells.length === 2 &&
        (isLifeLabSpeechPresentationLabel(cells[0] ?? "") ||
          normalizeLabel(parsed[0]?.[0] ?? "") === "item"),
    );

  if (!isLabelValueTable) {
    return rows;
  }

  return body
    .map((cells) => cells[1]?.trim() ?? "")
    .filter(Boolean)
    .map((value) => `- ${value}`);
}

function speakTimelineListTimestamps(content: string): string {
  return content.replace(
    /^(\s*[-*+]\s+)(?:\*\*)?(\d{1,3}:\d{2}(?::\d{2})?)(?:\*\*)?\s*(?:[-–—:]\s*)?/gm,
    (_, prefix: string, timestamp: string) =>
      `${prefix}${timelineTimestampToSpeech(timestamp)} `,
  );
}

function transformTables(content: string): string {
  const lines = content.split("\n");
  const output: string[] = [];
  let index = 0;

  while (index < lines.length) {
    if (!lines[index]?.trim().startsWith("|")) {
      output.push(lines[index] ?? "");
      index += 1;
      continue;
    }

    const rows: string[] = [];

    while (index < lines.length && lines[index]?.trim().startsWith("|")) {
      rows.push(lines[index] ?? "");
      index += 1;
    }

    output.push(...transformPresentationTable(rows));
  }

  return output.join("\n");
}

function stripPresentationFieldLabels(content: string): string {
  const labels = PRESENTATION_LABELS.map((label) =>
    label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|");
  const separated = content.replace(
    new RegExp(`\\s+(?=\\*\\*(?:${labels}):\\*\\*)`, "gi"),
    "\n",
  );

  return separated
    .split("\n")
    .map((line) => {
      const match = line.match(
        /^(\s*(?:[-*+]\s+|\d+[.)]\s+)?)((?:\*\*)?)([^:*|]+?):(?:\*\*)?\s*(.*)$/,
      );

      if (!match || !isLifeLabSpeechPresentationLabel(match[3] ?? "")) {
        return line;
      }

      const prefix = match[1] ?? "";
      const value = match[4]?.trim() ?? "";
      return value ? `${prefix}${value}` : "";
    })
    .join("\n");
}

export function prepareLifeLabSpeechMarkdown(input: {
  content: string;
  metadata?: LifeLabNoteMetadata;
  disclosures?: LifeLabSpeechDisclosure[];
}): string {
  const visible = applyLifeLabSpeechDisclosureVisibility(
    input.content,
    input.disclosures,
  );
  const withoutRepeatedMetadata = suppressExactHeaderMetadataLines(
    visible,
    input.metadata,
  );

  return stripPresentationFieldLabels(
    speakTimelineListTimestamps(
      transformTables(
        withoutRepeatedMetadata.replace(MERMAID_BLOCK_PATTERN, "Learning map."),
      ),
    ),
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildLifeLabSpeechHeaderValues(
  metadata: LifeLabNoteMetadata | undefined,
): string[] {
  if (!metadata) {
    return [];
  }

  const values = [
    metadata.show,
    metadata.channel ??
      metadata.channelName ??
      metadata.sourceName ??
      metadata.source_name ??
      metadata.publication,
    metadata.publication_date ?? metadata.date,
    metadata.duration,
    metadata.platform?.replace(/_/g, " "),
  ];

  return values
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim())
    .filter(
      (value, index, all) =>
        all.findIndex(
          (candidate) => candidate.toLowerCase() === value.toLowerCase(),
        ) === index,
    );
}
