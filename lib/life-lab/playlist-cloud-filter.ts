import type { LifeLabNoteMetadata } from "@/lib/life-lab/constants";
import type { FrequencyCloudItem } from "@/lib/life-lab/frequency-cloud";

export type PlaylistCloudFilterType = "concepts" | "people";

export type PlaylistCloudContext = {
  playlistTitle: string;
  channelName: string | null;
  presenters: string[];
  cloudStopTerms: string[];
  cloudBoostTerms: string[];
  dominantTopicTerms: string[];
};

export type FilteredCloudItem = FrequencyCloudItem & {
  rawCount: number;
  adjustedWeight: number;
  visible: boolean;
};

const PRESENTER_TITLE_PATTERNS = [
  /^(.+?)\s+with\s+(.+)$/i,
  /^(.+?)\s+by\s+(.+)$/i,
] as const;

const STUDIES_PERSON_PATTERN =
  /\b(?:philosophy|life|works|thought|ideas|legacy)\s+of\b/i;

const DOMINANT_TOPIC_PENALTY = 0.25;
const STOP_TERM_PENALTY = 0.2;
const BOOST_MULTIPLIER = 1.2;

function normalizeTerm(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, "")
    .replace(/\s+/g, " ");
}

function termVariants(term: string): string[] {
  const normalized = normalizeTerm(term);

  if (!normalized) {
    return [];
  }

  const variants = new Set<string>([normalized]);

  if (normalized.endsWith("s") && normalized.length > 3) {
    variants.add(normalized.slice(0, -1));
  } else if (!normalized.endsWith("s")) {
    variants.add(`${normalized}s`);
  }

  if (normalized.endsWith("ies") && normalized.length > 4) {
    variants.add(`${normalized.slice(0, -3)}y`);
  } else if (normalized.endsWith("y") && normalized.length > 2) {
    variants.add(`${normalized.slice(0, -1)}ies`);
  }

  if (normalized.endsWith("ing") && normalized.length > 5) {
    variants.add(normalized.slice(0, -3));
  }

  return [...variants];
}

function expandTerms(terms: string[]): Set<string> {
  const expanded = new Set<string>();

  for (const term of terms) {
    for (const variant of termVariants(term)) {
      expanded.add(variant);
    }
  }

  return expanded;
}

function splitPersonName(name: string): string[] {
  const trimmed = name.trim();

  if (!trimmed) {
    return [];
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return [trimmed];
  }

  return [trimmed, parts[parts.length - 1]!];
}

export function extractPresentersFromPlaylistTitle(title: string): string[] {
  const trimmed = title.trim();

  for (const pattern of PRESENTER_TITLE_PATTERNS) {
    const match = trimmed.match(pattern);

    if (!match?.[1] || !match[2]) {
      continue;
    }

    const subject = match[1].trim();
    const person = match[2].trim();

    if (!person || STUDIES_PERSON_PATTERN.test(subject)) {
      return [];
    }

    return splitPersonName(person);
  }

  return [];
}

export function extractDominantTopicTermsFromTitle(title: string): string[] {
  const withoutPresenter = title
    .replace(/\s+with\s+.+$/i, "")
    .replace(/\s+by\s+.+$/i, "")
    .trim();

  const words = withoutPresenter
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}'-]/gu, ""))
    .filter((word) => word.length > 2);

  return words.flatMap((word) => termVariants(word));
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function readMetadataStringArray(
  metadata: LifeLabNoteMetadata | undefined,
  keys: string[],
): string[] {
  if (!metadata) {
    return [];
  }

  for (const key of keys) {
    const value = metadata[key as keyof LifeLabNoteMetadata];

    if (Array.isArray(value)) {
      const items = readStringArray(value);

      if (items.length > 0) {
        return items;
      }
    }

    if (typeof value === "string" && value.trim()) {
      return [value.trim()];
    }
  }

  return [];
}

export function buildPlaylistCloudContext(input: {
  playlistTitle: string;
  channelName?: string | null;
  metadata?: LifeLabNoteMetadata;
}): PlaylistCloudContext {
  const playlistTitle = input.playlistTitle.trim();
  const metadata = input.metadata;
  const channelName =
    input.channelName?.trim() ??
    metadata?.channel?.trim() ??
    metadata?.channelName?.trim() ??
    metadata?.youtubeChannel?.trim() ??
    null;

  const fromTitle = extractPresentersFromPlaylistTitle(playlistTitle).flatMap(
    (name) => splitPersonName(name),
  );
  const fromMetadata = readMetadataStringArray(metadata, [
    "presenters",
    "presenter",
    "instructor",
    "instructors",
    "host",
    "hosts",
    "lecturer",
    "lecturers",
  ]);

  const presenters = [...new Set([...fromMetadata, ...fromTitle])];

  const cloudStopTerms = [
    ...readMetadataStringArray(metadata, ["cloudStopTerms", "cloud_stop_terms"]),
    ...extractDominantTopicTermsFromTitle(playlistTitle),
  ];

  if (channelName) {
    cloudStopTerms.push(channelName);
  }

  const cloudBoostTerms = readMetadataStringArray(metadata, [
    "cloudBoostTerms",
    "cloud_boost_terms",
  ]);

  return {
    playlistTitle,
    channelName,
    presenters: [...new Set(presenters)],
    cloudStopTerms: [...new Set(cloudStopTerms)],
    cloudBoostTerms: [...new Set(cloudBoostTerms)],
    dominantTopicTerms: extractDominantTopicTermsFromTitle(playlistTitle),
  };
}

function matchesAnyTerm(label: string, terms: Set<string>): boolean {
  const normalized = normalizeTerm(label);
  const labelVariants = termVariants(label);

  for (const variant of labelVariants) {
    if (terms.has(variant)) {
      return true;
    }
  }

  for (const term of terms) {
    if (normalized === term) {
      return true;
    }

    if (normalized.includes(term) && term.length >= 4) {
      return true;
    }
  }

  return false;
}

function stopTermPenalty(label: string, stopTerms: Set<string>): number {
  if (!matchesAnyTerm(label, stopTerms)) {
    return 1;
  }

  return STOP_TERM_PENALTY;
}

function dominantTopicPenalty(
  label: string,
  dominantTerms: Set<string>,
  type: PlaylistCloudFilterType,
): number {
  if (type !== "concepts" || dominantTerms.size === 0) {
    return 1;
  }

  return matchesAnyTerm(label, dominantTerms) ? DOMINANT_TOPIC_PENALTY : 1;
}

function boostMultiplier(label: string, boostTerms: Set<string>): number {
  return matchesAnyTerm(label, boostTerms) ? BOOST_MULTIPLIER : 1;
}

export function filterPlaylistCloudItems(input: {
  items: FrequencyCloudItem[];
  playlistTitle: string;
  channelName?: string | null;
  presenterNames?: string[];
  dominantTopicTerms?: string[];
  cloudStopTerms?: string[];
  cloudBoostTerms?: string[];
  metadata?: LifeLabNoteMetadata;
  type: PlaylistCloudFilterType;
  maxVisible?: number;
}): {
  visibleItems: FilteredCloudItem[];
  allItems: FilteredCloudItem[];
} {
  const context = buildPlaylistCloudContext({
    playlistTitle: input.playlistTitle,
    channelName: input.channelName,
    metadata: input.metadata,
  });

  const presenters = expandTerms([
    ...context.presenters,
    ...(input.presenterNames ?? []),
  ]);
  const stopTerms = expandTerms([
    ...context.cloudStopTerms,
    ...(input.cloudStopTerms ?? []),
  ]);
  const boostTerms = expandTerms([
    ...context.cloudBoostTerms,
    ...(input.cloudBoostTerms ?? []),
  ]);
  const dominantTerms = expandTerms([
    ...context.dominantTopicTerms,
    ...(input.dominantTopicTerms ?? []),
  ]);

  const allItems = input.items.map((item) => {
    const isPresenter =
      input.type === "people" && matchesAnyTerm(item.label, presenters);
    const isChannelNoise =
      input.type === "people" &&
      Boolean(context.channelName) &&
      matchesAnyTerm(item.label, expandTerms([context.channelName!]));
    const isDominantTopic =
      input.type === "concepts" && matchesAnyTerm(item.label, dominantTerms);
    const relevanceWeight = isPresenter || isChannelNoise ? 0 : 1;
    const stopPenalty =
      input.type === "people"
        ? stopTermPenalty(item.label, stopTerms)
        : Math.min(
            stopTermPenalty(item.label, stopTerms),
            dominantTopicPenalty(item.label, dominantTerms, input.type),
          );
    const diversityBoost = boostMultiplier(item.label, boostTerms);
    const adjustedWeight =
      item.count * relevanceWeight * stopPenalty * diversityBoost;
    const visible =
      relevanceWeight > 0 && !isDominantTopic && adjustedWeight > 0.5;

    return {
      ...item,
      rawCount: item.count,
      adjustedWeight,
      visible,
    };
  });

  const maxVisible = input.maxVisible ?? (input.type === "people" ? 20 : 24);
  const visibleItems = allItems
    .filter((item) => item.visible)
    .sort(
      (left, right) =>
        right.adjustedWeight - left.adjustedWeight ||
        right.rawCount - left.rawCount ||
        left.label.localeCompare(right.label),
    )
    .slice(0, maxVisible);

  return {
    visibleItems,
    allItems: allItems.sort(
      (left, right) =>
        right.rawCount - left.rawCount || left.label.localeCompare(right.label),
    ),
  };
}
