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

export function relativePathSubfolder(relativePath: string): string | null {
  const parts = relativePath.split("/").filter(Boolean);

  if (parts.length <= 1) {
    return null;
  }

  return parts[0] ?? null;
}

export function isReadmeRelativePath(relativePath: string): boolean {
  const filename = relativePath.split("/").pop() ?? relativePath;

  return filename.replace(/\.md$/i, "").toLowerCase() === "readme";
}

export function isReadmeSlug(slug: string): boolean {
  const relativePath = slugToRelativePath(slug);

  return isReadmeRelativePath(relativePath);
}

export function slugToTitle(slug: string): string {
  const leafSlug = slug.includes("__") ? slug.split("__").at(-1) ?? slug : slug;

  return leafSlug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function parseDateFromFilename(filename: string): string | null {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
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
