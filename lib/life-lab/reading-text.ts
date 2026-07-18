import type { LifeLabNoteMetadata } from "@/lib/life-lab/constants";

export type BionicTextSegment = {
  text: string;
  emphasized: boolean;
};

export type StudyTargetKind = "term" | "concept" | "person" | "organization";

export type StudyTarget = {
  text: string;
  kind: StudyTargetKind;
};

export type StudyTextSegment = {
  text: string;
  target?: StudyTarget;
};

const BIONIC_TOKEN_PATTERN =
  /https?:\/\/[^\s]+|www\.[^\s]+|[A-Za-z][A-Za-z’'-]*/g;
const BIONIC_SEGMENT_CACHE = new Map<string, BionicTextSegment[]>();
const STUDY_SEGMENT_CACHE = new Map<string, StudyTextSegment[]>();
const MAX_SEGMENT_CACHE_SIZE = 2000;

function cacheSegments<T>(
  cache: Map<string, T>,
  key: string,
  value: T,
): T {
  if (cache.size >= MAX_SEGMENT_CACHE_SIZE) {
    cache.delete(cache.keys().next().value ?? "");
  }

  cache.set(key, value);
  return value;
}

function latinLetterCount(value: string): number {
  return (value.match(/[A-Za-z]/g) ?? []).length;
}

export function bionicPrefixLength(letterCount: number): number {
  if (letterCount < 4) return 0;
  if (letterCount <= 5) return 2;
  if (letterCount <= 9) return 3;
  return 4;
}

function splitBionicWord(word: string): BionicTextSegment[] {
  const letterCount = latinLetterCount(word);
  const prefixLetters = bionicPrefixLength(letterCount);

  if (
    prefixLetters === 0 ||
    /^[A-Z]/.test(word) ||
    /^[A-Z'-]+$/.test(word)
  ) {
    return [{ text: word, emphasized: false }];
  }

  let splitIndex = 0;
  let lettersSeen = 0;

  while (splitIndex < word.length && lettersSeen < prefixLetters) {
    if (/[A-Za-z]/.test(word[splitIndex] ?? "")) {
      lettersSeen += 1;
    }
    splitIndex += 1;
  }

  return [
    { text: word.slice(0, splitIndex), emphasized: true },
    { text: word.slice(splitIndex), emphasized: false },
  ].filter((segment) => segment.text);
}

export function segmentBionicText(text: string): BionicTextSegment[] {
  const cached = BIONIC_SEGMENT_CACHE.get(text);

  if (cached) {
    return cached;
  }

  if (/[\u0600-\u06ff]/.test(text)) {
    return cacheSegments(BIONIC_SEGMENT_CACHE, text, [
      { text, emphasized: false },
    ]);
  }

  const segments: BionicTextSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(BIONIC_TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    const token = match[0];

    if (index > cursor) {
      segments.push({ text: text.slice(cursor, index), emphasized: false });
    }

    if (/^(?:https?:\/\/|www\.)/i.test(token)) {
      segments.push({ text: token, emphasized: false });
    } else {
      segments.push(...splitBionicWord(token));
    }

    cursor = index + token.length;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), emphasized: false });
  }

  return cacheSegments(BIONIC_SEGMENT_CACHE, text, segments);
}

function targetValues(
  values: string[] | undefined,
  kind: StudyTargetKind,
): StudyTarget[] {
  return (values ?? [])
    .map((text) => text.trim())
    .filter((text) => text.length >= 2)
    .map((text) => ({ text, kind }));
}

export function buildStudyTargets(
  metadata: LifeLabNoteMetadata | undefined,
): StudyTarget[] {
  if (!metadata) {
    return [];
  }

  const targets = [
    ...targetValues(
      [
        metadata.term,
        metadata.display_title,
        ...(metadata.aliases ?? []),
      ].filter((value): value is string => Boolean(value?.trim())),
      "term",
    ),
    ...targetValues(metadata.concepts, "concept"),
    ...targetValues(metadata.people, "person"),
    ...targetValues(metadata.organizations, "organization"),
  ];
  const seen = new Set<string>();

  return targets
    .sort((left, right) => right.text.length - left.text.length)
    .filter((target) => {
      const key = target.text.toLocaleLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function isWordCharacter(value: string | undefined): boolean {
  return Boolean(value && /[\p{L}\p{N}]/u.test(value));
}

function targetMatchAt(
  text: string,
  lowerText: string,
  target: StudyTarget,
  fromIndex: number,
): number {
  const lowerTarget = target.text.toLocaleLowerCase();
  let index = lowerText.indexOf(lowerTarget, fromIndex);

  while (index !== -1) {
    const end = index + target.text.length;

    if (
      !isWordCharacter(text[index - 1]) &&
      !isWordCharacter(text[end])
    ) {
      return index;
    }

    index = lowerText.indexOf(lowerTarget, index + 1);
  }

  return -1;
}

export function segmentStudyText(
  text: string,
  targets: StudyTarget[],
): StudyTextSegment[] {
  const cacheKey = `${targets
    .map((target) => `${target.kind}:${target.text}`)
    .join("\u001f")}\u0000${text}`;
  const cached = STUDY_SEGMENT_CACHE.get(cacheKey);

  if (cached) {
    return cached;
  }

  if (!text || targets.length === 0) {
    return cacheSegments(STUDY_SEGMENT_CACHE, cacheKey, [{ text }]);
  }

  const segments: StudyTextSegment[] = [];
  const lowerText = text.toLocaleLowerCase();
  let cursor = 0;

  while (cursor < text.length) {
    let best:
      | { index: number; target: StudyTarget }
      | undefined;

    for (const target of targets) {
      const index = targetMatchAt(text, lowerText, target, cursor);

      if (
        index !== -1 &&
        (!best ||
          index < best.index ||
          (index === best.index && target.text.length > best.target.text.length))
      ) {
        best = { index, target };
      }
    }

    if (!best) {
      segments.push({ text: text.slice(cursor) });
      break;
    }

    if (best.index > cursor) {
      segments.push({ text: text.slice(cursor, best.index) });
    }

    const end = best.index + best.target.text.length;
    segments.push({
      text: text.slice(best.index, end),
      target: best.target,
    });
    cursor = end;
  }

  return cacheSegments(STUDY_SEGMENT_CACHE, cacheKey, segments);
}
