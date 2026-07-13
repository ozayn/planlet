/**
 * Conservative title matching for Life Lab / Coaching narration.
 * Used to speak the document title once and drop a matching leading H1.
 */

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  nbsp: " ",
};

const KNOWN_TITLE_SUFFIXES = [
  "playlist summary",
  "summary",
  "index",
  "overview",
  "notes",
] as const;

function decodeBasicHtmlEntities(value: string): string {
  return value.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (match, entity: string) => {
    const key = entity.toLowerCase();

    if (key in HTML_ENTITY_MAP) {
      return HTML_ENTITY_MAP[key]!;
    }

    if (key.startsWith("#x")) {
      const code = Number.parseInt(key.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }

    if (key.startsWith("#")) {
      const code = Number.parseInt(key.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }

    return match;
  });
}

export function normalizeNarrationTitle(value: string): string {
  return decodeBasicHtmlEntities(value)
    .normalize("NFKC")
    .replace(/^#+\s*/, "")
    .replace(/[*_`~]+/g, "")
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/^\d{4}-\d{2}-\d{2}[-_\s]*/g, "")
    .replace(/[:.|/\\]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function stripKnownTitleSuffix(normalized: string): string {
  let current = normalized;

  for (const suffix of KNOWN_TITLE_SUFFIXES) {
    const dashed = new RegExp(
      `\\s*[-–—|:]+\\s*${suffix.replace(/\s+/g, "\\s+")}$`,
      "i",
    );
    const plain = new RegExp(`\\s+${suffix.replace(/\s+/g, "\\s+")}$`, "i");

    if (dashed.test(current)) {
      current = current.replace(dashed, "").trim();
      break;
    }

    if (plain.test(current)) {
      current = current.replace(plain, "").trim();
      break;
    }
  }

  return current.replace(/[-–—|:]+$/g, "").trim();
}

/**
 * Returns true when two titles should be treated as the same narration title.
 * Conservative: exact normalize match, or known soft suffixes like
 * "Death with Shelly Kagan — Playlist Summary" ≈ "Death with Shelly Kagan".
 * Does not collapse unrelated headings (e.g. Western Philosophy vs Playlist Summary).
 */
export function isSameNarrationTitle(a: string, b: string): boolean {
  const left = normalizeNarrationTitle(a);
  const right = normalizeNarrationTitle(b);

  if (!left || !right) {
    return false;
  }

  if (left === right) {
    return true;
  }

  const leftCore = stripKnownTitleSuffix(left);
  const rightCore = stripKnownTitleSuffix(right);

  if (leftCore && rightCore && leftCore === rightCore) {
    return true;
  }

  return false;
}
