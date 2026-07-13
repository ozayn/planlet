import type { ClientSettingsSearchEntry, SettingsSearchResult } from "@/lib/settings/types";

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase();
}

function matchesQuery(query: string, target: string): boolean {
  const normalizedTarget = normalizeSearchText(target);
  return normalizedTarget.includes(query) || query.includes(normalizedTarget);
}

export function searchSettings(
  entries: ClientSettingsSearchEntry[],
  rawQuery: string,
): SettingsSearchResult[] {
  const query = normalizeSearchText(rawQuery);

  if (!query) {
    return [];
  }

  const results = new Map<string, SettingsSearchResult>();

  for (const entry of entries) {
    let matchedField: SettingsSearchResult["matchedField"] | null = null;

    if (matchesQuery(query, entry.title)) {
      matchedField = "title";
    } else if (entry.subtitle && matchesQuery(query, entry.subtitle)) {
      matchedField = "subtitle";
    } else if (entry.keywords.some((keyword) => matchesQuery(query, keyword))) {
      matchedField = "keyword";
    }

    if (!matchedField || results.has(entry.id)) {
      continue;
    }

    results.set(entry.id, {
      id: entry.id,
      title: entry.title,
      subtitle: entry.subtitle,
      href: entry.href,
      categoryTitle: entry.categoryTitle,
      matchedField,
    });
  }

  return Array.from(results.values());
}
