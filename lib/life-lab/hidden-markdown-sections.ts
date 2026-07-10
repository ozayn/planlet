/** Headings omitted from the normal Life Lab reading flow. Extend as metadata evolves. */
export const HIDDEN_MARKDOWN_SECTIONS = [
  "Source notes",
  "Source note",
  "Visual anchor",
  "Developer information",
  "Processing notes",
  "Internal metadata",
  "Extraction metadata",
] as const;

export const VISUAL_ANCHOR_SECTION_TITLE = "Visual anchor";

function normalizeSectionTitle(title: string): string {
  return title.trim().toLowerCase();
}

const HIDDEN_SECTION_TITLES = new Set(
  HIDDEN_MARKDOWN_SECTIONS.map(normalizeSectionTitle),
);

export function isHiddenMarkdownSection(title: string): boolean {
  return HIDDEN_SECTION_TITLES.has(normalizeSectionTitle(title));
}
