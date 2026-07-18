import type { LifeLabNoteMetadata } from "@/lib/life-lab/constants";
import { stripLeadingMarkdownH1 } from "@/lib/life-lab/note-content";

export type LifeLabNoteQualityIssueKind =
  | "duplicate-title"
  | "duplicate-paragraph"
  | "duplicate-bullet"
  | "near-duplicate-bullet"
  | "duplicate-heading-block"
  | "redundant-timeline"
  | "repeated-metadata"
  | "verbose-dictionary-candidates";

export type LifeLabNoteQualityIssue = {
  kind: LifeLabNoteQualityIssueKind;
  message: string;
};

type MarkdownSection = {
  title: string;
  content: string;
  raw: string;
};

const HEADER_METADATA_LABELS: Array<{
  label: string;
  keys: Array<keyof LifeLabNoteMetadata>;
}> = [
  { label: "Show", keys: ["show"] },
  { label: "Date", keys: ["publication_date", "date"] },
  { label: "Duration", keys: ["duration"] },
  { label: "Platform", keys: ["platform"] },
  { label: "Source type", keys: ["source"] },
  { label: "Tags", keys: ["tags"] },
  {
    label: "Transcription method",
    keys: ["transcription_method"],
  },
];

function normalizeStructure(value: string): string {
  return value
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function listH2Sections(content: string): {
  preamble: string;
  sections: MarkdownSection[];
} {
  const matches = [...content.matchAll(/^##\s+(.+?)\s*$/gm)];
  const preamble = content.slice(0, matches[0]?.index ?? content.length).trim();
  const sections = matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? content.length;
    const raw = content.slice(start, end).trim();

    return {
      title: match[1]!.trim(),
      content: raw.slice(match[0].length).trim(),
      raw,
    };
  });

  return { preamble, sections };
}

function isPlainParagraph(block: string): boolean {
  return (
    normalizeStructure(block).length >= 30 &&
    !/^(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>|```|~~~|\||<)/m.test(block)
  );
}

function suppressExactBlocks(content: string): string {
  const seenParagraphs = new Set<string>();
  const seenBullets = new Set<string>();

  return content
    .split(/\n{2,}/)
    .flatMap((block) => {
      const lines = block.split("\n");
      const nonEmptyLines = lines.filter((line) => line.trim());
      const isBulletBlock =
        nonEmptyLines.length > 0 &&
        nonEmptyLines.every((line) => /^\s*[-*+]\s+/.test(line));

      if (isBulletBlock) {
        const kept = lines.filter((line) => {
          const normalized = normalizeStructure(
            line.replace(/^\s*[-*+]\s+/, ""),
          );

          if (normalized.length < 12 || !seenBullets.has(normalized)) {
            if (normalized.length >= 12) {
              seenBullets.add(normalized);
            }

            return true;
          }

          return false;
        });

        return kept.length > 0 ? [kept.join("\n")] : [];
      }

      if (isPlainParagraph(block)) {
        const normalized = normalizeStructure(block);

        if (seenParagraphs.has(normalized)) {
          return [];
        }

        seenParagraphs.add(normalized);
      }

      return [block];
    })
    .join("\n\n")
    .trim();
}

function suppressExactSectionBlocks(content: string): string {
  const { preamble, sections } = listH2Sections(content);

  if (sections.length === 0) {
    return content;
  }

  const seenBlocks = new Set<string>();
  const outlineContent = sections.find((section) =>
    /^(?:episode\s+)?outline$/i.test(section.title),
  )?.content;
  const normalizedOutline = outlineContent
    ? normalizeStructure(outlineContent)
    : null;
  const kept = sections.filter((section) => {
    const normalizedBlock = `${normalizeStructure(section.title)}\n${normalizeStructure(section.content)}`;

    if (seenBlocks.has(normalizedBlock)) {
      return false;
    }

    seenBlocks.add(normalizedBlock);

    if (
      /^timeline$/i.test(section.title) &&
      normalizedOutline &&
      normalizeStructure(section.content) === normalizedOutline
    ) {
      return false;
    }

    return true;
  });

  return [preamble, ...kept.map((section) => section.raw)]
    .filter(Boolean)
    .join("\n\n");
}

export function suppressExactLifeLabMarkdownDuplicates(
  content: string,
  pageTitle?: string,
): string {
  const withoutDuplicateTitle =
    pageTitle &&
    normalizeStructure(content.match(/^#\s+(.+?)\s*$/m)?.[1] ?? "") ===
      normalizeStructure(pageTitle)
      ? stripLeadingMarkdownH1(content)
      : content;

  return suppressExactBlocks(
    suppressExactSectionBlocks(withoutDuplicateTitle),
  );
}

function metadataDisplayValues(
  metadata: LifeLabNoteMetadata,
  keys: Array<keyof LifeLabNoteMetadata>,
): string[] {
  return keys.flatMap((key) => {
    const value = metadata[key];

    if (Array.isArray(value)) {
      return [value.join(", "), value.join(" · ")];
    }

    if (typeof value === "string" || typeof value === "number") {
      return [String(value)];
    }

    return [];
  });
}

export function suppressExactHeaderMetadataLines(
  content: string,
  metadata: LifeLabNoteMetadata | undefined,
): string {
  if (!metadata) {
    return content;
  }

  const valuesByLabel = new Map(
    HEADER_METADATA_LABELS.flatMap((item) => {
      const values = metadataDisplayValues(metadata, item.keys).map(
        normalizeStructure,
      );

      return values.length > 0
        ? [[item.label.toLowerCase(), new Set(values)] as const]
        : [];
    }),
  );

  const filteredLines = content
    .split("\n")
    .filter((line) => {
      const table = line.match(/^\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/);
      const labeled = line.match(
        /^\s*(?:[-*+]\s+)?(?:\*\*)?([^:*|]+?)(?:\*\*)?\s*:\s*(.+?)\s*$/,
      );
      const label = (table?.[1] ?? labeled?.[1])?.trim().toLowerCase();
      const value = (table?.[2] ?? labeled?.[2])?.trim();

      if (!label || !value) {
        return true;
      }

      return !valuesByLabel.get(label)?.has(normalizeStructure(value));
    });
  const withoutEmptyTables = filteredLines.filter((line, index) => {
    const next = filteredLines[index + 1];
    const afterSeparator = filteredLines[index + 2];
    const isEmptyTableHeader =
      /^\s*\|.+\|\s*$/.test(line) &&
      Boolean(next && /^\s*\|(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(next)) &&
      !Boolean(afterSeparator && /^\s*\|.+\|\s*$/.test(afterSeparator));
    const followsEmptyTableHeader =
      index > 0 &&
      /^\s*\|(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(line) &&
      /^\s*\|.+\|\s*$/.test(filteredLines[index - 1] ?? "") &&
      !Boolean(next && /^\s*\|.+\|\s*$/.test(next));

    return !isEmptyTableHeader && !followsEmptyTableHeader;
  });

  return withoutEmptyTables
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

function wordSet(value: string): Set<string> {
  return new Set(
    normalizeStructure(value)
      .split(/[^a-z0-9\u0600-\u06ff]+/)
      .filter((word) => word.length > 2),
  );
}

function jaccardSimilarity(left: string, right: string): number {
  const leftWords = wordSet(left);
  const rightWords = wordSet(right);

  if (leftWords.size === 0 || rightWords.size === 0) {
    return 0;
  }

  let intersection = 0;

  for (const word of leftWords) {
    if (rightWords.has(word)) {
      intersection += 1;
    }
  }

  return intersection / (leftWords.size + rightWords.size - intersection);
}

export function auditLifeLabNoteQuality(input: {
  content: string;
  title?: string;
  metadata?: LifeLabNoteMetadata;
}): LifeLabNoteQualityIssue[] {
  const { content, title, metadata } = input;
  const issues: LifeLabNoteQualityIssue[] = [];
  const leadingH1 = content.match(/^#\s+(.+?)\s*$/m)?.[1];

  if (
    leadingH1 &&
    title &&
    normalizeStructure(leadingH1) === normalizeStructure(title)
  ) {
    issues.push({
      kind: "duplicate-title",
      message: "The first H1 duplicates the page title.",
    });
  }

  const { sections } = listH2Sections(content);
  const seenParagraphs = new Map<string, string>();
  const seenBullets = new Map<string, string>();
  const seenHeadingBlocks = new Map<string, string>();

  for (const section of sections) {
    const blockKey = `${normalizeStructure(section.title)}\n${normalizeStructure(section.content)}`;
    const priorBlock = seenHeadingBlocks.get(blockKey);

    if (priorBlock) {
      issues.push({
        kind: "duplicate-heading-block",
        message: `"${section.title}" duplicates an earlier heading block.`,
      });
    } else {
      seenHeadingBlocks.set(blockKey, section.title);
    }

    for (const block of section.content.split(/\n{2,}/)) {
      if (!isPlainParagraph(block)) {
        continue;
      }

      const normalized = normalizeStructure(block);
      const prior = seenParagraphs.get(normalized);

      if (prior) {
        issues.push({
          kind: "duplicate-paragraph",
          message: `An exact paragraph is repeated in "${prior}" and "${section.title}".`,
        });
      } else {
        seenParagraphs.set(normalized, section.title);
      }
    }

    const bullets = section.content
      .split("\n")
      .filter((line) => /^\s*[-*+]\s+/.test(line));

    bullets.forEach((bullet, index) => {
      const normalized = normalizeStructure(
        bullet.replace(/^\s*[-*+]\s+/, ""),
      );
      const prior = seenBullets.get(normalized);

      if (normalized.length >= 12 && prior) {
        issues.push({
          kind: "duplicate-bullet",
          message: `An exact bullet is repeated in "${prior}" and "${section.title}".`,
        });
      } else if (normalized.length >= 12) {
        seenBullets.set(normalized, section.title);
      }

      const next = bullets[index + 1];
      const currentWords = wordSet(bullet);
      const nextWords = next ? wordSet(next) : new Set<string>();

      if (
        next &&
        currentWords.size >= 6 &&
        nextWords.size >= 6 &&
        normalized !== normalizeStructure(next) &&
        jaccardSimilarity(bullet, next) >= 0.82
      ) {
        issues.push({
          kind: "near-duplicate-bullet",
          message: `Two adjacent bullets in "${section.title}" are near-identical; review rather than suppress automatically.`,
        });
      }
    });
  }

  const outline = sections.find((section) =>
    /^(?:episode\s+)?outline$/i.test(section.title),
  );
  const timeline = sections.find((section) =>
    /^timeline$/i.test(section.title),
  );

  if (
    outline &&
    timeline &&
    normalizeStructure(outline.content) === normalizeStructure(timeline.content)
  ) {
    issues.push({
      kind: "redundant-timeline",
      message: "Timeline exactly duplicates Outline and is suppressed.",
    });
  }

  const dictionaryCandidates = sections.find((section) =>
    /^dictionary candidates$/i.test(section.title),
  );

  if (
    dictionaryCandidates &&
    /\b(?:Meaning|Context|Why it is useful|My example sentence)\s*:/i.test(
      dictionaryCandidates.content,
    )
  ) {
    issues.push({
      kind: "verbose-dictionary-candidates",
      message:
        "Dictionary candidates repeat vocabulary details; render a term-only promotion list.",
    });
  }

  if (metadata) {
    for (const item of HEADER_METADATA_LABELS) {
      const headerValues = new Set(
        metadataDisplayValues(metadata, item.keys).map(normalizeStructure),
      );
      const hasExactBodyValue = content.split("\n").some((line) => {
        const table = line.match(
          /^\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/,
        );
        const labeled = line.match(
          /^\s*(?:[-*+]\s+)?(?:\*\*)?([^:*|]+?)(?:\*\*)?\s*:\s*(.+?)\s*$/,
        );
        const label = (table?.[1] ?? labeled?.[1])?.trim();
        const value = (table?.[2] ?? labeled?.[2])?.trim();

        return (
          label?.toLowerCase() === item.label.toLowerCase() &&
          Boolean(value && headerValues.has(normalizeStructure(value)))
        );
      });

      if (hasExactBodyValue) {
        issues.push({
          kind: "repeated-metadata",
          message: `${item.label} appears in both header metadata and note content.`,
        });
      }
    }
  }

  return issues.filter(
    (issue, index, all) =>
      all.findIndex(
        (candidate) =>
          candidate.kind === issue.kind && candidate.message === issue.message,
      ) === index,
  );
}
