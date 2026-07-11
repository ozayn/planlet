export type PlaylistTitleCleanupContext = {
  playlistTitle?: string | null;
  channel?: string | null;
};

const SUFFIX_SEPARATORS = [": ", " - ", " – ", " — ", " | "] as const;

function normalizeTitleToken(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function titleEndsWithSuffix(title: string, suffix: string): boolean {
  const trimmedSuffix = suffix.trim();

  if (!trimmedSuffix) {
    return false;
  }

  return SUFFIX_SEPARATORS.some((separator) =>
    title.toLowerCase().endsWith(`${separator}${trimmedSuffix}`.toLowerCase()),
  );
}

function stripTitleSuffix(title: string, suffix: string): string | null {
  const trimmedSuffix = suffix.trim();

  if (!trimmedSuffix) {
    return null;
  }

  for (const separator of SUFFIX_SEPARATORS) {
    const pattern = new RegExp(
      `${escapeRegExp(separator)}${escapeRegExp(trimmedSuffix)}\\s*$`,
      "i",
    );
    const result = title.replace(pattern, "").trim();

    if (result && result.toLowerCase() !== title.toLowerCase()) {
      return result;
    }
  }

  return null;
}

function countTitlesEndingWithSuffix(titles: string[], suffix: string): number {
  return titles.filter((title) => titleEndsWithSuffix(title, suffix)).length;
}

function isRepeatedEnough(count: number, total: number): boolean {
  return total > 0 && count >= 2 && count / total >= 0.5;
}

function isMeaningfulRemainder(original: string, stripped: string): boolean {
  if (stripped.length < 3) {
    return false;
  }

  if (normalizeTitleToken(stripped) === normalizeTitleToken(original)) {
    return false;
  }

  return stripped.length >= Math.min(12, Math.floor(original.length * 0.25));
}

export function detectRepeatedPlaylistSuffix(
  titles: string[],
  context: PlaylistTitleCleanupContext = {},
): string | null {
  if (titles.length === 0) {
    return null;
  }

  const candidates = new Map<string, number>();

  for (const title of titles) {
    const colonMatch = title.match(/:\s*([^:]+)$/);

    if (colonMatch?.[1]?.trim()) {
      const suffix = colonMatch[1].trim();

      if (suffix.length >= 3) {
        candidates.set(suffix, (candidates.get(suffix) ?? 0) + 1);
      }
    }
  }

  for (const candidate of [context.playlistTitle, context.channel]) {
    if (!candidate?.trim()) {
      continue;
    }

    const count = countTitlesEndingWithSuffix(titles, candidate.trim());

    if (isRepeatedEnough(count, titles.length)) {
      candidates.set(candidate.trim(), count);
    }
  }

  const qualifying = [...candidates.entries()].filter(([, count]) =>
    isRepeatedEnough(count, titles.length),
  );

  if (qualifying.length === 0) {
    return null;
  }

  qualifying.sort((left, right) => {
    const countDelta = right[1] - left[1];

    if (countDelta !== 0) {
      return countDelta;
    }

    return right[0].length - left[0].length;
  });

  return qualifying[0]?.[0] ?? null;
}

export function cleanPlaylistVideoDisplayTitle(
  title: string,
  context: PlaylistTitleCleanupContext = {},
  repeatedSuffix?: string | null,
  options?: { allowDirectContextSuffix?: boolean },
): string {
  const trimmed = title.trim();

  if (!trimmed) {
    return trimmed;
  }

  const suffixesToTry: string[] = [];

  if (repeatedSuffix?.trim()) {
    suffixesToTry.push(repeatedSuffix.trim());
  }

  if (options?.allowDirectContextSuffix) {
    for (const candidate of [context.playlistTitle, context.channel]) {
      if (
        candidate?.trim() &&
        !suffixesToTry.some(
          (suffix) =>
            normalizeTitleToken(suffix) === normalizeTitleToken(candidate),
        )
      ) {
        suffixesToTry.push(candidate.trim());
      }
    }
  }

  for (const suffix of suffixesToTry) {
    if (!titleEndsWithSuffix(trimmed, suffix)) {
      continue;
    }

    const stripped = stripTitleSuffix(trimmed, suffix);

    if (!stripped || !isMeaningfulRemainder(trimmed, stripped)) {
      continue;
    }

    return stripped;
  }

  return trimmed;
}

export function cleanPlaylistVideoDisplayTitles(
  titles: string[],
  context: PlaylistTitleCleanupContext = {},
): string[] {
  const repeatedSuffix = detectRepeatedPlaylistSuffix(titles, context);

  return titles.map((title) =>
    cleanPlaylistVideoDisplayTitle(title, context, repeatedSuffix),
  );
}

export function cleanYoutubePlaylistVideoTitle(
  title: string,
  context: PlaylistTitleCleanupContext = {},
): string {
  return cleanPlaylistVideoDisplayTitle(title, context, null, {
    allowDirectContextSuffix: true,
  });
}
