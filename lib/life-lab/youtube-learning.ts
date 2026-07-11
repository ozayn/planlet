import type { LifeLabNoteMetadata, LifeLabSectionId } from "@/lib/life-lab/constants";
import { isYoutubeVideoNote } from "@/lib/life-lab/playlist-index";
import { cleanYoutubePlaylistVideoTitle } from "@/lib/life-lab/playlist-title-cleanup";

const TITLE_CASE_SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
]);

function titleCaseWord(word: string, index: number): string {
  const lower = word.toLowerCase();

  if (index > 0 && TITLE_CASE_SMALL_WORDS.has(lower)) {
    return lower;
  }

  if (word === word.toUpperCase()) {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  return word;
}

function titleCaseSegment(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => titleCaseWord(word, index))
    .join(" ");
}

function cleanQuotedSubtitle(value: string): string {
  return titleCaseSegment(
    value
      .replace(/^[\s:?.\-–—]+/, "")
      .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
      .trim(),
  );
}

export function youtubeVideoDisplayTitle(
  title: string,
  metadata?: LifeLabNoteMetadata,
): string {
  const trimmed = title.trim();
  let display = trimmed;

  if (trimmed.length > 72) {
    const episodeFromMetadata =
      metadata?.episode != null ? String(metadata.episode).replace(/^0+/, "") : null;
    const episodeMatch = trimmed.match(/\b(?:Episode|Ep\.?)\s*0*(\d+)\b/i);
    const episodeNumber = episodeFromMetadata ?? episodeMatch?.[1] ?? null;
    const episodeSplit = trimmed.split(/\b(?:Episode|Ep\.?)\s*0*\d+\b/i);
    const beforeEpisode = episodeSplit[0]?.trim() ?? trimmed;
    const afterEpisode = episodeSplit[1]?.trim() ?? "";

    let series = beforeEpisode.replace(/\?.*$/, "").trim();
    const colonIndex = series.indexOf(":");

    if (colonIndex !== -1) {
      series = series.slice(0, colonIndex).trim();
    }

    let subtitle = cleanQuotedSubtitle(afterEpisode);

    if (!subtitle) {
      const quoteMatch = trimmed.match(/["“]([^"”]+)["”]/);

      if (quoteMatch?.[1]) {
        subtitle = cleanQuotedSubtitle(quoteMatch[1]);
      }
    }

    if (episodeNumber && subtitle) {
      display = `${series}, Episode ${episodeNumber}: ${subtitle}`;
    } else if (subtitle) {
      display = `${series}: ${subtitle}`;
    } else if (series.length > 0 && series.length < trimmed.length) {
      display = series;
    }
  }

  if (metadata?.playlist?.trim()) {
    display = cleanYoutubePlaylistVideoTitle(display, {
      playlistTitle: metadata.playlist,
      channel: metadata.channel,
    });
  }

  return display;
}

export function lifeLabNoteDisplayTitle(input: {
  title: string;
  sectionId: LifeLabSectionId;
  metadata?: LifeLabNoteMetadata;
  relativePath?: string;
  subfolderLabel?: string | null;
}): string {
  if (input.sectionId === "youtube-learning") {
    const relativePath = input.relativePath ?? "";

    if (
      isYoutubeVideoNote({
        relativePath,
        subfolderLabel: input.subfolderLabel ?? null,
        metadata: input.metadata,
      })
    ) {
      return youtubeVideoDisplayTitle(input.title, input.metadata);
    }
  }

  return input.title;
}

export function lifeLabNoteDisplayTitleDiffers(input: {
  title: string;
  sectionId: LifeLabSectionId;
  metadata?: LifeLabNoteMetadata;
  relativePath?: string;
  subfolderLabel?: string | null;
}): boolean {
  return lifeLabNoteDisplayTitle(input) !== input.title.trim();
}
