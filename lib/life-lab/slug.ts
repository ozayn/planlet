export function driveFilenameToSlug(filename: string): string {
  const base = filename.replace(/\.md$/i, "").trim();

  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function driveRelativePathToSlug(relativePath: string): string {
  const withoutExtension = relativePath.replace(/\.md$/i, "").trim();

  return withoutExtension
    .split("/")
    .filter(Boolean)
    .map((segment) => driveFilenameToSlug(`${segment}.md`))
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
  const stem = filename.replace(/\.md$/i, "").trim();
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
