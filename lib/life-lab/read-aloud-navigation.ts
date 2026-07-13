import type {
  ReadAloudPlaybackPlan,
  ReadAloudSectionChunkRange,
} from "@/lib/life-lab/narration-chunks";

export type ReadAloudPlaybackOptions = {
  autoContinue: boolean;
  playOnlySection: boolean;
};

export function getNextChunkIndexAfterPlayback(
  plan: ReadAloudPlaybackPlan,
  chunkIndex: number,
  options: ReadAloudPlaybackOptions,
): number | null {
  return getNextChunkIndexFromRanges(plan.sectionChunkRanges, chunkIndex, options);
}

export function getNextChunkIndexFromRanges(
  ranges: ReadAloudSectionChunkRange[],
  chunkIndex: number,
  options: ReadAloudPlaybackOptions,
): number | null {
  const rangeIndex = ranges.findIndex(
    (range) =>
      chunkIndex >= range.firstChunkIndex &&
      chunkIndex < range.firstChunkIndex + range.chunkCount,
  );

  if (rangeIndex < 0) {
    return null;
  }

  const range = ranges[rangeIndex];
  const isLastChunkInSection =
    chunkIndex >= range.firstChunkIndex + range.chunkCount - 1;

  if (!isLastChunkInSection) {
    return chunkIndex + 1;
  }

  if (options.playOnlySection || !options.autoContinue) {
    return null;
  }

  return ranges[rangeIndex + 1]?.firstChunkIndex ?? null;
}

export function getPreviousSectionFirstChunkIndex(
  ranges: ReadAloudSectionChunkRange[],
  currentSectionIndex: number,
): number | null {
  const previousSection = ranges[currentSectionIndex - 1];

  return previousSection?.firstChunkIndex ?? null;
}

export function getNextSectionFirstChunkIndex(
  ranges: ReadAloudSectionChunkRange[],
  currentSectionIndex: number,
): number | null {
  const nextSection = ranges[currentSectionIndex + 1];

  return nextSection?.firstChunkIndex ?? null;
}

export function getFirstChunkIndexForSectionId(
  ranges: ReadAloudSectionChunkRange[],
  sectionId: string,
): number | null {
  const range = ranges.find((entry) => entry.sectionId === sectionId);

  return range?.firstChunkIndex ?? null;
}
