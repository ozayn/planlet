import { extractFlashcardsFromMarkdown } from "@/lib/life-lab/flashcards";
import type { LifeLabFlashcard, LifeLabNoteMetadata } from "@/lib/life-lab/constants";
import { markdownExcerpt } from "@/lib/life-lab/slug";

const OPENING_SYNTHESIS_PATTERN =
  /^##\s+Opening synthesis\s*\n+([\s\S]*?)(?=\n##\s+|$)/im;

const SOURCE_NOTE_PATTERN =
  /^##\s+Source note\s*[\s\S]*?(?=\n##\s+|$)/im;

export const READING_BRIEF_INTEREST_TOPICS = [
  "iran",
  "political identity",
  "nationalism",
  "migration",
  "institutions",
  "psychology",
  "language",
  "history",
  "climate",
  "data visualization",
  "systems thinking",
  "political legitimacy",
  "public memory",
  "state power",
  "borders",
] as const;

export const READING_BRIEF_CLUSTER_EXAMPLES = [
  "Iran / succession / state ritual",
  "Europe / nationalism / law",
  "Ukraine / war economy",
  "Migration / moral boundaries",
  "Climate / public data",
] as const;

export const READING_BRIEF_MIN_FLASHCARDS = 8;

export const READING_BRIEF_MAX_FLASHCARDS = 12;

export const READING_BRIEF_REQUIRED_SECTIONS = [
  {
    id: "opening-synthesis",
    title: "Opening synthesis",
    pattern: /^##\s+Opening synthesis\s*$/im,
  },
  {
    id: "top-story-clusters",
    title: "Top story clusters",
    pattern: /^##\s+Top story clusters\s*$/im,
  },
  {
    id: "better-than-bbc",
    title: "Better than BBC",
    pattern: /^##\s+Better than BBC\s*$/im,
  },
  {
    id: "vocabulary",
    title: "Vocabulary and phrasing",
    pattern: /^##\s+Vocabulary and phrasing\s*$/im,
  },
  {
    id: "names-concepts",
    title: "Names and concepts to remember",
    pattern: /^##\s+Names and concepts to remember\s*$/im,
  },
  {
    id: "flashcards",
    title: "Optional Flashcards",
    pattern: /^##\s+(?:Optional Flashcards|Flashcards|Study Cards)\s*$/im,
  },
  {
    id: "save-worthy",
    title: "Save-worthy articles",
    pattern: /^##\s+Save-worthy articles\s*$/im,
  },
  {
    id: "follow-up",
    title: "Follow-up questions",
    pattern: /^##\s+Follow-up questions\s*$/im,
  },
  {
    id: "personal-relevance",
    title: "Why this brief fits Azin's interests today",
    pattern:
      /^##\s+Why this brief fits Azin(?:'s)? interests today\s*$/im,
  },
] as const;

export const READING_BRIEF_NAV_TARGETS = [
  {
    id: "short-version",
    label: "Short version",
    headings: ["Short version", "At a glance"],
  },
  {
    id: "top-clusters",
    label: "Top clusters",
    headings: ["Top story clusters", "Story clusters"],
  },
  {
    id: "study-notes",
    label: "Study notes",
    headings: [
      "Study layer",
      "Study notes",
      "Better than BBC",
      "Vocabulary and phrasing",
      "Names and concepts to remember",
    ],
  },
  {
    id: "flashcards",
    label: "Flashcards",
    headings: ["Optional Flashcards", "Flashcards", "Study Cards"],
  },
  {
    id: "follow-ups",
    label: "Follow-ups",
    headings: ["Follow-up questions"],
  },
] as const;

const HEADING_TO_NAV_ID: Record<string, string> = {
  "short version": "short-version",
  "at a glance": "short-version",
  "top story clusters": "top-clusters",
  "story clusters": "top-clusters",
  "study layer": "study-notes",
  "study notes": "study-notes",
  "better than bbc": "study-notes",
  "vocabulary and phrasing": "study-notes",
  "names and concepts to remember": "study-notes",
  "optional flashcards": "flashcards",
  flashcards: "flashcards",
  "study cards": "flashcards",
  "follow-up questions": "follow-ups",
};

const FLASHCARD_SECTION_TITLES = new Set([
  "optional flashcards",
  "flashcards",
  "study cards",
]);

const SOURCE_LIMITATION_PATTERN =
  /rss|headlines?\s+only|source\s+limitation|did not read full articles/i;

export type ReadingBriefStructureAssessment = {
  presentSections: string[];
  missingSections: string[];
  flashcardCount: number;
  hasSourceLimitation: boolean;
  meetsFlashcardMinimum: boolean;
};

export type ReadingBriefNavSection = {
  id: string;
  label: string;
};

export type ReadingBriefDisplay = {
  shortVersion: string | null;
  bodyForRender: string;
  navSections: ReadingBriefNavSection[];
};

export type ReadingBriefGlanceFields = {
  pattern: string | null;
  topStories: string | null;
  question: string | null;
  whyItMatters: string | null;
};

export type SaveWorthyGroup = {
  id: "must" | "maybe" | "skip";
  label: string;
  content: string;
};

const COLLAPSIBLE_READING_BRIEF_HEADINGS = new Set([
  "source note",
  "better than bbc",
  "vocabulary and phrasing",
  "names and concepts to remember",
  "follow-up questions",
]);

export type ReadingBriefSegment =
  | {
      kind: "markdown";
      heading: string | null;
      content: string;
      collapsible?: boolean;
      preview?: string | null;
    }
  | { kind: "glance"; title: string; content: string }
  | { kind: "flashcards"; cards: LifeLabFlashcard[] }
  | { kind: "save-worthy"; groups: SaveWorthyGroup[] };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function bodyHasH2Section(body: string, title: string): boolean {
  return new RegExp(`^##\\s+${escapeRegExp(title)}\\s*$`, "im").test(body);
}

function extractH2SectionByTitles(
  body: string,
  titles: readonly string[],
): string | null {
  for (const title of titles) {
    const headerPattern = new RegExp(
      `^##\\s+${escapeRegExp(title)}\\s*$`,
      "im",
    );
    const match = headerPattern.exec(body);

    if (!match) {
      continue;
    }

    const rest = body.slice(match.index + match[0].length);
    const nextHeader = rest.search(/^##\s+/m);
    const content = (
      nextHeader === -1 ? rest : rest.slice(0, nextHeader)
    ).trim();

    if (content) {
      return content;
    }
  }

  return null;
}

function removeH2SectionByTitles(
  body: string,
  titles: readonly string[],
): string {
  let result = body;

  for (const title of titles) {
    const headerPattern = new RegExp(
      `^##\\s+${escapeRegExp(title)}\\s*$`,
      "im",
    );
    const match = headerPattern.exec(result);

    if (!match) {
      continue;
    }

    const rest = result.slice(match.index + match[0].length);
    const nextHeader = rest.search(/^##\s+/m);
    const endIndex =
      nextHeader === -1
        ? result.length
        : match.index + match[0].length + nextHeader;

    result = `${result.slice(0, match.index)}${result.slice(endIndex)}`.trim();
  }

  return result.trim();
}

function extractLabeledBlock(section: string, label: string): string | null {
  const escaped = escapeRegExp(label);
  const boundary = String.raw`(?=\n\*\*|\n###|\n##|$)`;
  const patterns = [
    new RegExp(
      String.raw`\*\*${escaped}\*\*\s*\n+([\s\S]*?)${boundary}`,
      "i",
    ),
    new RegExp(
      String.raw`\*\*${escaped}\*\*\s+(.+?)${boundary}`,
      "i",
    ),
    new RegExp(
      String.raw`###\s+${escaped}\s*\n+([\s\S]*?)${boundary}`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = section.match(pattern);

    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }

  return null;
}

export function readingBriefHeadingAnchor(headingText: string): string | undefined {
  return HEADING_TO_NAV_ID[headingText.trim().toLowerCase()];
}

export function detectReadingBriefNavSections(
  body: string,
): ReadingBriefNavSection[] {
  const seen = new Set<string>();

  return READING_BRIEF_NAV_TARGETS.flatMap((target) => {
    const present = target.headings.some((heading) =>
      bodyHasH2Section(body, heading),
    );

    if (!present || seen.has(target.id)) {
      return [];
    }

    seen.add(target.id);

    return [{ id: target.id, label: target.label }];
  });
}

export function shouldShowReadingBriefNav(body: string): boolean {
  return detectReadingBriefNavSections(body).length >= 2;
}

export function readingBriefDisplayTitle(title: string): string {
  const withoutIsoDate = title
    .replace(/\s*[—–-]\s*\d{4}-\d{2}-\d{2}.*$/, "")
    .trim();

  return withoutIsoDate || title;
}

export function parseGlanceListItems(text: string): string[] {
  const bulletLines = text
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);

  if (bulletLines.length > 1) {
    return bulletLines;
  }

  if (text.includes("·")) {
    return text
      .split("·")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const trimmed = text.trim();

  return trimmed ? [trimmed] : [];
}

export function isCollapsibleReadingBriefSection(title: string): boolean {
  return COLLAPSIBLE_READING_BRIEF_HEADINGS.has(title.trim().toLowerCase());
}

export function readingBriefSectionPreview(
  title: string,
  body: string,
): string | null {
  if (title.trim().toLowerCase() !== "source note") {
    return null;
  }

  const firstLine = body.split("\n").find((line) => line.trim())?.trim();

  return firstLine ? markdownExcerpt(firstLine, 72) : null;
}

export function extractReadingBriefGlanceFields(
  content: string,
): ReadingBriefGlanceFields {
  return {
    pattern:
      extractLabeledBlock(content, "Pattern of the day") ??
      extractLabeledBlock(content, "Pattern"),
    topStories: extractLabeledBlock(content, "Top 3 stories"),
    question: extractLabeledBlock(content, "Question to carry"),
    whyItMatters: extractLabeledBlock(content, "Why it matters"),
  };
}

export function listReadingBriefH2Sections(body: string): {
  title: string;
  content: string;
  start: number;
}[] {
  const regex = /^##\s+(.+?)\s*$/gm;
  const matches = [...body.matchAll(regex)];

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const contentStart = start + match[0].length;
    const nextMatch = matches[index + 1];
    const end = nextMatch?.index ?? body.length;

    return {
      title: match[1].trim(),
      content: body.slice(contentStart, end).trim(),
      start,
    };
  });
}

function parseTableRow(line: string): string[] {
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function isTableRow(line: string): boolean {
  return line.trim().startsWith("|");
}

function isTableSeparator(line: string): boolean {
  return /^\|\s*:?-{3,}/.test(line.trim());
}

export function transformMarkdownTables(content: string): string {
  const lines = content.split("\n");
  const result: string[] = [];
  let index = 0;

  while (index < lines.length) {
    if (!isTableRow(lines[index] ?? "")) {
      result.push(lines[index] ?? "");
      index += 1;
      continue;
    }

    const tableLines: string[] = [];

    while (index < lines.length && isTableRow(lines[index] ?? "")) {
      tableLines.push(lines[index] ?? "");
      index += 1;
    }

    if (tableLines.length < 2) {
      result.push(...tableLines);
      continue;
    }

    const headers = parseTableRow(tableLines[0] ?? "");

    for (const rowLine of tableLines.slice(2)) {
      if (isTableSeparator(rowLine)) {
        continue;
      }

      const cells = parseTableRow(rowLine);

      if (!cells[0]) {
        continue;
      }

      result.push(`### ${cells[0]}`);

      for (let cellIndex = 1; cellIndex < headers.length; cellIndex += 1) {
        const header = headers[cellIndex];
        const value = cells[cellIndex];

        if (header && value) {
          result.push(`**${header}:** ${value}`);
        }
      }

      result.push("");
    }
  }

  return result.join("\n");
}

const SAVE_WORTHY_GROUP_PATTERNS: {
  id: SaveWorthyGroup["id"];
  label: string;
  pattern: RegExp;
}[] = [
  { id: "must", label: "Must save", pattern: /^###\s+Must save\s*$/im },
  { id: "maybe", label: "Maybe save", pattern: /^###\s+Maybe save\s*$/im },
  { id: "skip", label: "Skip", pattern: /^###\s+Skip\s*$/im },
];

export function parseSaveWorthySection(sectionContent: string): SaveWorthyGroup[] {
  const groups: SaveWorthyGroup[] = [];

  for (const group of SAVE_WORTHY_GROUP_PATTERNS) {
    const match = group.pattern.exec(sectionContent);

    if (!match) {
      continue;
    }

    const rest = sectionContent.slice(match.index + match[0].length);
    const nextGroup = rest.search(/^###\s+/m);
    const content = (
      nextGroup === -1 ? rest : rest.slice(0, nextGroup)
    ).trim();

    if (content) {
      groups.push({
        id: group.id,
        label: group.label,
        content,
      });
    }
  }

  if (groups.length > 0) {
    return groups;
  }

  const trimmed = sectionContent.trim();

  return trimmed
    ? [{ id: "must", label: "Save-worthy", content: trimmed }]
    : [];
}

function isGlanceSectionTitle(title: string): boolean {
  const normalized = title.trim().toLowerCase();
  return normalized === "short version" || normalized === "at a glance";
}

function isFlashcardSectionTitle(title: string): boolean {
  return FLASHCARD_SECTION_TITLES.has(title.trim().toLowerCase());
}

function isSaveWorthySectionTitle(title: string): boolean {
  return title.trim().toLowerCase() === "save-worthy articles";
}

export function prepareReadingBriefSegments(
  body: string,
  flashcards: LifeLabFlashcard[] = extractFlashcardsFromMarkdown(body),
): {
  glanceSegments: ReadingBriefSegment[];
  contentSegments: ReadingBriefSegment[];
  navSections: ReadingBriefNavSection[];
} {
  const sections = listReadingBriefH2Sections(body);
  const segments: ReadingBriefSegment[] = [];

  if (sections.length === 0) {
    return {
      glanceSegments: [],
      contentSegments: [
        {
          kind: "markdown",
          heading: null,
          content: transformMarkdownTables(body),
        },
      ],
      navSections: detectReadingBriefNavSections(body),
    };
  }

  const preambleEnd = sections[0]?.start ?? body.length;
  const preamble = body.slice(0, preambleEnd).trim();

  if (preamble) {
    segments.push({
      kind: "markdown",
      heading: null,
      content: transformMarkdownTables(preamble),
    });
  }

  for (const section of sections) {
    if (isGlanceSectionTitle(section.title)) {
      segments.push({
        kind: "glance",
        title: section.title,
        content: section.content,
      });
      continue;
    }

    if (isFlashcardSectionTitle(section.title)) {
      segments.push({
        kind: "flashcards",
        cards: flashcards,
      });
      continue;
    }

    if (isSaveWorthySectionTitle(section.title)) {
      segments.push({
        kind: "save-worthy",
        groups: parseSaveWorthySection(section.content),
      });
      continue;
    }

    segments.push({
      kind: "markdown",
      heading: section.title,
      content: transformMarkdownTables(
        isCollapsibleReadingBriefSection(section.title)
          ? section.content
          : `## ${section.title}\n\n${section.content}`,
      ),
      collapsible: isCollapsibleReadingBriefSection(section.title),
      preview: readingBriefSectionPreview(section.title, section.content),
    });
  }

  return {
    glanceSegments: segments.filter((segment) => segment.kind === "glance"),
    contentSegments: segments.filter((segment) => segment.kind !== "glance"),
    navSections: detectReadingBriefNavSections(body),
  };
}

export function prepareReadingBriefDisplay(body: string): ReadingBriefDisplay {
  const shortVersion = extractH2SectionByTitles(body, ["Short version"]);
  const bodyForRender = shortVersion
    ? removeH2SectionByTitles(body, ["Short version"])
    : body;

  return {
    shortVersion,
    bodyForRender,
    navSections: detectReadingBriefNavSections(body),
  };
}

export function assessReadingBriefStructure(
  content: string,
): ReadingBriefStructureAssessment {
  const presentSections = READING_BRIEF_REQUIRED_SECTIONS.filter((section) =>
    section.pattern.test(content),
  ).map((section) => section.title);
  const missingSections = READING_BRIEF_REQUIRED_SECTIONS.filter(
    (section) => !section.pattern.test(content),
  ).map((section) => section.title);
  const flashcardCount = extractFlashcardsFromMarkdown(content).length;

  return {
    presentSections,
    missingSections,
    flashcardCount,
    hasSourceLimitation: SOURCE_LIMITATION_PATTERN.test(content),
    meetsFlashcardMinimum: flashcardCount >= READING_BRIEF_MIN_FLASHCARDS,
  };
}

export function isReadingBriefDailySlug(slug: string): boolean {
  return slug.startsWith("daily__");
}

export function isReadingBriefNote(record: {
  relativePath: string;
  subfolderLabel?: string | null;
  metadata?: LifeLabNoteMetadata;
}): boolean {
  if (record.metadata?.type === "reading-brief") {
    return true;
  }

  if (record.metadata?.source === "bbc-world-service") {
    return true;
  }

  const subfolder = record.subfolderLabel?.toLowerCase();

  if (subfolder === "daily" || subfolder === "saved-articles") {
    return true;
  }

  const path = record.relativePath.toLowerCase();

  return path.startsWith("daily/") || path.startsWith("saved-articles/");
}

export function extractReadingBriefPreview(
  body: string,
  maxLength = 280,
): string {
  for (const title of ["Short version", "At a glance"] as const) {
    const glanceSection = extractH2SectionByTitles(body, [title]);

    if (!glanceSection) {
      continue;
    }

    const parts = [
      extractLabeledBlock(glanceSection, "Pattern of the day"),
      extractLabeledBlock(glanceSection, "Top 3 stories"),
      extractLabeledBlock(glanceSection, "Question to carry"),
    ].filter((part): part is string => Boolean(part));

    if (parts.length > 0) {
      return markdownExcerpt(
        parts.map((part) => markdownExcerpt(part, 120)).join(" · "),
        maxLength,
      );
    }

    return markdownExcerpt(glanceSection, maxLength);
  }

  const openingMatch = body.match(OPENING_SYNTHESIS_PATTERN);

  if (openingMatch?.[1]?.trim()) {
    return markdownExcerpt(openingMatch[1].trim(), maxLength);
  }

  const trimmedBody = body.replace(SOURCE_NOTE_PATTERN, "").trim();

  return markdownExcerpt(trimmedBody, maxLength);
}
