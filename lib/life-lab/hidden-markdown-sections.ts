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
  "Implementation details",
  "Processing pipeline",
  "Transcription details",
  "RSS retrieval details",
  "Audio processing details",
  "Audio optimization details",
  "Chunk processing",
  "Processing metadata",
  "Debug information",
  "Working folders",
  "Internal IDs",
  "Provenance",
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
  "transcript source",
  "transcription method",
  "rss retrieval",
  "rss retrieval details",
  "audio optimization",
  "audio processing",
  "big audio",
  "chunk processing",
  "chunk count",
  "whisper model",
  "processing pipeline",
  "processing metadata",
  "working folder",
  "working folders",
  "working directory",
  "working directories",
  "debug information",
  "generation timestamp",
  "internal id",
  "internal ids",
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
  /\blocal whisper transcription\b/i,
  /\bwhisper(?:\s+model)?\s*[:=]?\s*(?:tiny|base|small|medium|large)(?:\.en)?\b/i,
  /\b(?:rss retrieval|rss enclosure|simplecast rss|podcast:transcript)\b/i,
  /\bbig audio\b/i,
  /\baudio (?:was )?(?:optimized|downloaded|split|chunked)\b/i,
  /\b16\s*k(?:hz|ilohertz)\s+mono\b/i,
  /\b(?:chunk count|chunk processing|split into \w+ chunks?)\b/i,
  /\b(?:working folders?|working directories?)\b/i,
  /\bprocessing metadata\b/i,
  /\bdebug information\b/i,
  /(?:^|[\/~])(?:life-lab\/video-intake\/_working|\.openclaw\/workspace)\b/i,
  /\b(?:generation|generated|processing)\s+timestamp\b/i,
  /\binternal ids?\s*:/i,
] as const;

const PLANLET_HIDDEN_BLOCK_PATTERN =
  /<!--\s*planlet:hidden:start\s*-->[\s\S]*?<!--\s*planlet:hidden:end\s*-->/gi;

const FRONTMATTER_TECHNICAL_FIELDS = [
  {
    keys: ["technicalNotes", "technical_notes"],
    label: null,
  },
  {
    keys: [
      "sourceLimitations",
      "source_limitations",
      "sourceLimitation",
      "source_limitation",
    ],
    label: "Source limitations",
  },
  {
    keys: ["processingNotes", "processing_notes"],
    label: "Processing notes",
  },
  {
    keys: ["transcript_source", "transcriptSource"],
    label: "Transcript source",
  },
  {
    keys: ["transcription_method", "transcriptionMethod"],
    label: "Transcription method",
  },
  {
    keys: ["whisper_model", "whisperModel"],
    label: "Whisper model",
  },
  {
    keys: ["rss_retrieval", "rssRetrieval"],
    label: "RSS retrieval",
  },
  {
    keys: ["audio_optimization", "audioOptimization", "big_audio", "bigAudio"],
    label: "Audio optimization",
  },
  {
    keys: ["chunk_count", "chunkCount", "chunk_processing", "chunkProcessing"],
    label: "Chunk processing",
  },
  {
    keys: ["processing_pipeline", "processingPipeline", "processing_metadata"],
    label: "Processing metadata",
  },
  {
    keys: ["working_folder", "workingFolder", "working_directory"],
    label: "Working folder",
  },
  {
    keys: ["internal_id", "internalId", "internal_ids"],
    label: "Internal ID",
  },
  {
    keys: ["note_profile"],
    label: "Note profile",
  },
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

function lineLabel(line: string): string {
  const tableCells = line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|");

  if (tableCells.length >= 2) {
    return normalizeLabelLine(tableCells[0] ?? "").toLowerCase();
  }

  return normalizeLabelLine(
    line
      .trim()
      .replace(/^\s*[-*+]\s+/, "")
      .replace(/^#{1,6}\s+/, "")
      .replace(/^\*\*(.+?)\*\*(?:\s*:)?(?:\s+.*)?$/, "$1")
      .replace(/^([^:]+):.*$/, "$1"),
  ).toLowerCase();
}

function lineMatchesTechnicalImplementation(line: string): boolean {
  const trimmed = line.trim();

  if (!trimmed) {
    return false;
  }

  const label = lineLabel(trimmed);

  if (
    TECHNICAL_LABEL_PREFIXES.some(
      (prefix) => label === prefix || label.startsWith(`${prefix}:`),
    )
  ) {
    return true;
  }

  return TECHNICAL_PHRASE_MARKERS.some((pattern) => pattern.test(trimmed));
}

function splitTechnicalLines(body: string): TechnicalContentSplit {
  const hidden: string[] = [];
  const visible = body
    .split("\n")
    .filter((line) => {
      if (!lineMatchesTechnicalImplementation(line)) {
        return true;
      }

      hidden.push(line.trim());
      return false;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  return { visible, hidden };
}

export function extractFrontmatterTechnicalNotes(
  raw: Record<string, unknown>,
): string[] {
  const notes: string[] = [];

  for (const field of FRONTMATTER_TECHNICAL_FIELDS) {
    const value = field.keys
      .map((key) => raw[key])
      .find((candidate) => candidate !== undefined);
    const format = (entry: string) =>
      field.label ? `${field.label}: ${entry}` : entry;

    if (typeof value === "string" && value.trim()) {
      notes.push(format(value.trim()));
      continue;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      notes.push(format(String(value)));
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item.trim()) {
          notes.push(format(item.trim()));
        }
      }
    }
  }

  return notes;
}

export function stripTechnicalMetadataFromMarkdown(body: string): string {
  const blockSplit = stripPlanletHiddenBlocks(body);
  const lineSplit = splitTechnicalLines(blockSplit.visible);
  const paragraphSplit = stripTechnicalParagraphs(lineSplit.visible, {
    phraseOnlyInTail: true,
  });

  return paragraphSplit.visible.trim();
}

export function collectHiddenTechnicalContent(body: string): string[] {
  const blockSplit = stripPlanletHiddenBlocks(body);
  const lineSplit = splitTechnicalLines(blockSplit.visible);
  const paragraphSplit = stripTechnicalParagraphs(lineSplit.visible, {
    phraseOnlyInTail: false,
  });

  return [
    ...blockSplit.hidden,
    ...lineSplit.hidden,
    ...paragraphSplit.hidden,
  ].map((entry) => entry.trim()).filter(Boolean);
}
