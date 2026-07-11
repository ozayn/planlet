import {
  OPENAI_NARRATION_CHUNK_MAX_CHARS,
} from "@/lib/life-lab/narration-config";
import type { NarrationSection } from "@/lib/life-lab/narration-text";
import { chunkSpeechText } from "@/lib/life-lab/speech";

export type NarrationPlaybackChunk = {
  index: number;
  sectionLabel: string;
  text: string;
};

function splitSectionIntoChunks(
  section: NarrationSection,
  startIndex: number,
  maxLength: number,
): NarrationPlaybackChunk[] {
  const prefix = `${section.label}. `;
  const fullText = `${prefix}${section.body}`.trim();
  const parts = chunkSpeechText(fullText, maxLength);

  return parts.map((text, offset) => ({
    index: startIndex + offset,
    sectionLabel: section.label,
    text,
  }));
}

export function buildNarrationPlaybackChunks(
  sections: NarrationSection[],
  maxLength = OPENAI_NARRATION_CHUNK_MAX_CHARS,
): NarrationPlaybackChunk[] {
  const chunks: NarrationPlaybackChunk[] = [];
  let nextIndex = 0;

  for (const section of sections) {
    const sectionChunks = splitSectionIntoChunks(section, nextIndex, maxLength);
    chunks.push(...sectionChunks);
    nextIndex += sectionChunks.length;
  }

  return chunks.map((chunk, index) => ({
    ...chunk,
    index,
  }));
}

export function estimateNarrationInputCharacters(
  chunks: NarrationPlaybackChunk[],
): number {
  return chunks.reduce((total, chunk) => total + chunk.text.length, 0);
}
