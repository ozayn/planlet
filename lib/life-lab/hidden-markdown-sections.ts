/** Headings omitted from the normal Life Lab reading flow. */
export const HIDDEN_TECHNICAL_HEADINGS = [
  "Source limitation",
  "Source limitations",
  "Source note",
  "Source notes",
  "Extraction note",
  "Extraction notes",
  "Processing note",
  "Processing notes",
  "Transcript status",
  "Transcript unavailable",
  "Caption status",
  "Captions unavailable",
  "Data quality note",
  "Generation note",
  "Visual anchor",
  "Developer information",
  "Internal metadata",
  "Extraction metadata",
  "Technical details",
] as const;

/** @deprecated Use HIDDEN_TECHNICAL_HEADINGS */
export const HIDDEN_MARKDOWN_SECTIONS = HIDDEN_TECHNICAL_HEADINGS;

export const PRESERVED_SOURCE_HEADINGS = [
  "Sources",
  "Source",
  "Further reading",
  "References",
  "Articles cited",
  "Primary sources",
  "Bibliography",
  "Citations",
  "Works cited",
] as const;

export const TECHNICAL_LABEL_PREFIXES = [
  "source limitation",
  "source limitations",
  "source note",
  "source notes",
  "extraction note",
  "extraction notes",
  "processing note",
  "processing notes",
  "transcript status",
  "transcript unavailable",
  "caption status",
  "captions unavailable",
  "data quality note",
  "generation note",
] as const;

const TECHNICAL_PHRASE_MARKERS = [
  /youtube caption download hit http 429/i,
  /first-pass note from public metadata/i,
  /not a transcript-grounded note/i,
  /captions could not be downloaded/i,
  /generated from title\/description only/i,
  /\byt-dlp\b/i,
  /transcript omitted/i,
  /transcript available:\s*(yes|no)\b/i,
  /(?:caption|transcript).{0,60}rate limits?\b/i,
  /\brate limits?.{0,60}(?:caption|transcript)/i,
] as const;

const PLANLET_HIDDEN_BLOCK_PATTERN =
  /<!--\s*planlet:hidden:start\s*-->[\s\S]*?<!--\s*planlet:hidden:end\s*-->/gi;

const FRONTMATTER_TECHNICAL_FIELDS = [
  "technicalNotes",
  "technical_notes",
  "sourceLimitations",
  "source_limitations",
  "sourceLimitation",
  "source_limitation",
  "processingNotes",
  "processing_notes",
] as const;

export const VISUAL_ANCHOR_SECTION_TITLE = "Visual anchor";

export type TechnicalContentSplit = {
  visible: string;
  hidden: string[];
};

function normalizeSectionTitle(title: string): string {
  return title
    .trim()
    .replace(/[:#]+$/, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

const HIDDEN_SECTION_TITLES = new Set(
  HIDDEN_TECHNICAL_HEADINGS.map(normalizeSectionTitle),
);

const PRESERVED_SECTION_TITLES = new Set(
  PRESERVED_SOURCE_HEADINGS.map(normalizeSectionTitle),
);

export function isPreservedSourceHeading(title: string): boolean {
  return PRESERVED_SECTION_TITLES.has(normalizeSectionTitle(title));
}

export function isHiddenTechnicalHeading(title: string): boolean {
  const normalized = normalizeSectionTitle(title);

  if (isPreservedSourceHeading(title)) {
    return false;
  }

  return HIDDEN_SECTION_TITLES.has(normalized);
}

/** @deprecated Use isHiddenTechnicalHeading */
export function isHiddenMarkdownSection(title: string): boolean {
  return isHiddenTechnicalHeading(title);
}

function normalizeLabelLine(line: string): string {
  return line.trim().replace(/^[*_~]+|[*_~]+$/g, "").replace(/:+$/, "");
}

export function isTechnicalLabelLine(line: string): boolean {
  const trimmed = line.trim();

  if (!trimmed) {
    return false;
  }

  const withoutHeading = trimmed.replace(/^#{1,6}\s+/, "");
  const withoutBold = withoutHeading.replace(/^\*\*(.+)\*\*$/, "$1");
  const label = normalizeLabelLine(withoutBold).toLowerCase();

  return TECHNICAL_LABEL_PREFIXES.some(
    (prefix) => label === prefix || label.startsWith(`${prefix}:`),
  );
}

export function paragraphMatchesTechnicalPhrase(
  paragraph: string,
  options: { allowPhraseOnly?: boolean } = {},
): boolean {
  const trimmed = paragraph.trim();

  if (!trimmed) {
    return false;
  }

  if (isTechnicalLabelLine(trimmed.split("\n")[0] ?? trimmed)) {
    return true;
  }

  if (!options.allowPhraseOnly) {
    return false;
  }

  return TECHNICAL_PHRASE_MARKERS.some((pattern) => pattern.test(trimmed));
}

export function stripPlanletHiddenBlocks(body: string): TechnicalContentSplit {
  const hidden: string[] = [];
  const visible = body.replace(PLANLET_HIDDEN_BLOCK_PATTERN, (match) => {
    hidden.push(match);
    return "";
  });

  return { visible, hidden };
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function stripTechnicalParagraphs(
  body: string,
  options: { phraseOnlyInTail?: boolean } = {},
): TechnicalContentSplit {
  const paragraphs = splitParagraphs(body);
  const hidden: string[] = [];
  const tailStart = Math.max(0, paragraphs.length - 3);

  const visible = paragraphs.filter((paragraph, index) => {
    const firstLine = paragraph.split("\n")[0] ?? paragraph;

    if (isTechnicalLabelLine(firstLine)) {
      hidden.push(paragraph);
      return false;
    }

    const allowPhraseOnly =
      options.phraseOnlyInTail === false || index >= tailStart;

    if (paragraphMatchesTechnicalPhrase(paragraph, { allowPhraseOnly })) {
      hidden.push(paragraph);
      return false;
    }

    return true;
  });

  return {
    visible: visible.join("\n\n"),
    hidden,
  };
}

export function extractFrontmatterTechnicalNotes(
  raw: Record<string, unknown>,
): string[] {
  const notes: string[] = [];

  for (const field of FRONTMATTER_TECHNICAL_FIELDS) {
    const value = raw[field];

    if (typeof value === "string" && value.trim()) {
      notes.push(value.trim());
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item.trim()) {
          notes.push(item.trim());
        }
      }
    }
  }

  return notes;
}

export function stripTechnicalMetadataFromMarkdown(body: string): string {
  const blockSplit = stripPlanletHiddenBlocks(body);
  const paragraphSplit = stripTechnicalParagraphs(blockSplit.visible, {
    phraseOnlyInTail: true,
  });

  return paragraphSplit.visible.trim();
}

export function collectHiddenTechnicalContent(body: string): string[] {
  const blockSplit = stripPlanletHiddenBlocks(body);
  const paragraphSplit = stripTechnicalParagraphs(blockSplit.visible, {
    phraseOnlyInTail: false,
  });

  return [
    ...blockSplit.hidden,
    ...paragraphSplit.hidden,
  ].map((entry) => entry.trim()).filter(Boolean);
}
