import {
  OPENAI_NARRATION_CHUNK_MAX_CHARS,
} from "@/lib/life-lab/narration-config";
import type { ReadAloudSection } from "@/lib/life-lab/read-aloud-sections";
import { isSameNarrationTitle } from "@/lib/life-lab/narration-title";
import { chunkSpeechText } from "@/lib/life-lab/speech";

export type NarrationPlaybackChunk = {
  index: number;
  sectionId: string;
  sectionTitle: string;
  sectionOrder: number;
  sectionIndex: number;
  sectionChunkIndex: number;
  sectionChunkCount: number;
  text: string;
};

export type ReadAloudSectionChunkRange = {
  sectionId: string;
  sectionTitle: string;
  sectionOrder: number;
  sectionIndex: number;
  firstChunkIndex: number;
  chunkCount: number;
};

export type ReadAloudPlaybackPlan = {
  sections: ReadAloudSection[];
  chunks: NarrationPlaybackChunk[];
  sectionChunkRanges: ReadAloudSectionChunkRange[];
};

/** @deprecated Use sectionTitle on NarrationPlaybackChunk */
export type LegacyNarrationPlaybackChunk = NarrationPlaybackChunk & {
  sectionLabel: string;
};

/**
 * Build the spoken string for a section without duplicating the title.
 * NOTE_TITLE (and any section whose body repeats the title) speaks once.
 */
export function buildSectionNarrationSpeechText(
  section: Pick<ReadAloudSection, "title" | "text" | "category">,
): string {
  const title = section.title.trim();
  const body = section.text.trim();

  if (!title && !body) {
    return "";
  }

  if (section.category === "NOTE_TITLE") {
    if (!body || isSameNarrationTitle(title, body)) {
      return title;
    }

    return `${title}. ${body}`;
  }

  if (!title) {
    return body;
  }

  if (!body) {
    return title;
  }

  if (isSameNarrationTitle(title, body)) {
    return title;
  }

  return `${title}. ${body}`;
}

function splitSectionIntoChunks(
  section: ReadAloudSection,
  sectionIndex: number,
  _startIndex: number,
  maxLength: number,
): Omit<NarrationPlaybackChunk, "index">[] {
  const fullText = buildSectionNarrationSpeechText(section);
  const parts = chunkSpeechText(fullText, maxLength);

  return parts.map((text, sectionChunkIndex) => ({
    sectionId: section.id,
    sectionTitle: section.title,
    sectionOrder: section.order,
    sectionIndex,
    sectionChunkIndex,
    sectionChunkCount: parts.length,
    text,
  }));
}

export function buildReadAloudPlaybackPlan(
  sections: ReadAloudSection[],
  maxLength = OPENAI_NARRATION_CHUNK_MAX_CHARS,
): ReadAloudPlaybackPlan {
  const chunks: Omit<NarrationPlaybackChunk, "index">[] = [];
  const sectionChunkRanges: ReadAloudSectionChunkRange[] = [];
  let nextIndex = 0;

  sections.forEach((section, sectionIndex) => {
    const firstChunkIndex = nextIndex;
    const sectionChunks = splitSectionIntoChunks(
      section,
      sectionIndex,
      nextIndex,
      maxLength,
    );

    if (sectionChunks.length === 0) {
      return;
    }

    sectionChunkRanges.push({
      sectionId: section.id,
      sectionTitle: section.title,
      sectionOrder: section.order,
      sectionIndex,
      firstChunkIndex,
      chunkCount: sectionChunks.length,
    });

    chunks.push(...sectionChunks);
    nextIndex += sectionChunks.length;
  });

  const indexedChunks = chunks.map((chunk, index) => ({
    ...chunk,
    index,
  }));

  return {
    sections,
    chunks: indexedChunks,
    sectionChunkRanges,
  };
}

export function buildNarrationPlaybackChunks(
  sections: ReadAloudSection[],
  maxLength = OPENAI_NARRATION_CHUNK_MAX_CHARS,
): NarrationPlaybackChunk[] {
  return buildReadAloudPlaybackPlan(sections, maxLength).chunks;
}

export function estimateNarrationInputCharacters(
  chunks: NarrationPlaybackChunk[],
): number {
  return chunks.reduce((total, chunk) => total + chunk.text.length, 0);
}

export function getSectionIndexForChunk(
  plan: ReadAloudPlaybackPlan,
  chunkIndex: number,
): number {
  const chunk = plan.chunks[chunkIndex];

  if (!chunk) {
    return 0;
  }

  return chunk.sectionIndex;
}

export function getFirstChunkIndexForSection(
  plan: ReadAloudPlaybackPlan,
  sectionIndex: number,
): number | null {
  return plan.sectionChunkRanges[sectionIndex]?.firstChunkIndex ?? null;
}

export function getLastChunkIndexForSection(
  plan: ReadAloudPlaybackPlan,
  sectionIndex: number,
): number | null {
  const range = plan.sectionChunkRanges[sectionIndex];

  if (!range) {
    return null;
  }

  return range.firstChunkIndex + range.chunkCount - 1;
}
