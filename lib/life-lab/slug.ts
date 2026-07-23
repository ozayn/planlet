const LIFE_LAB_NOTE_EXTENSIONS = /\.(md|txt|deck)$/i;

export function driveFilenameToSlug(filename: string): string {
  const base = filename.replace(LIFE_LAB_NOTE_EXTENSIONS, "").trim();

  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function driveRelativePathToSlug(relativePath: string): string {
  const withoutExtension = relativePath.replace(LIFE_LAB_NOTE_EXTENSIONS, "").trim();

  return withoutExtension
    .split("/")
    .filter(Boolean)
    .map((segment) => driveFilenameToSlug(segment))
    .join("__");
}

export function slugToRelativePath(slug: string): string {
  return `${slug.split("__").join("/")}.md`;
}

export function relativePathFilename(relativePath: string): string {
  return relativePath.split("/").pop() ?? relativePath;
}

export function relativePathSubfolder(relativePath: string): string | null {
  const parts = relativePath.split("/").filter(Boolean);

  if (parts.length <= 1) {
    return null;
  }

  return parts[0] ?? null;
}

export function isReadmeRelativePath(relativePath: string): boolean {
  const filename = relativePathFilename(relativePath);

  return filename.replace(/\.md$/i, "").toLowerCase() === "readme";
}

export function isReadmeSlug(slug: string): boolean {
  const relativePath = slugToRelativePath(slug);

  return isReadmeRelativePath(relativePath);
}

function capitalizeWord(word: string): string {
  if (!word) {
    return word;
  }

  return word.charAt(0).toUpperCase() + word.slice(1);
}

function titleFromStem(stem: string): string {
  return stem
    .split(/[-_]+/)
    .filter(Boolean)
    .map(capitalizeWord)
    .join(" ");
}

export function titleFromFilename(filename: string): string {
  const stem = filename.replace(LIFE_LAB_NOTE_EXTENSIONS, "").trim();
  const withoutDate = stem.replace(/^\d{4}-\d{2}-\d{2}-?/, "");

  if (withoutDate) {
    return titleFromStem(withoutDate);
  }

  return titleFromStem(stem);
}

export function slugToTitle(slug: string): string {
  const leafSlug = slug.includes("__") ? slug.split("__").at(-1) ?? slug : slug;

  return titleFromFilename(`${leafSlug}.md`);
}

export function titleFromMarkdownHeading(content: string): string | null {
  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    const match = trimmed.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);

    if (match?.[1]) {
      return match[1].trim();
    }

    // Stop at the first non-empty, non-heading line so a heading buried
    // deep in the document does not override the filename title.
    return null;
  }

  return null;
}

export function parseDateFromFilename(filename: string): string | null {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

export function formatDateLabelFromFilename(filename: string): string | null {
  const datePrefix = parseDateFromFilename(filename);

  if (!datePrefix) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${datePrefix}T12:00:00Z`));
}

export function markdownExcerpt(content: string, maxLength = 160): string {
  const plain = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[#>*_~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!plain) {
    return "";
  }

  if (plain.length <= maxLength) {
    return plain;
  }

  return `${plain.slice(0, maxLength - 1).trimEnd()}…`;
}
