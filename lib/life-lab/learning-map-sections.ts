/**
 * Headings whose Mermaid flowcharts should default to top-down layout.
 *
 * Authoring contract (Ava / OpenClaw): use `flowchart TD` or `graph TD` for
 * Learning Map diagrams unless horizontal layout is intentional — then add
 * `<!-- planlet:mermaid-direction=preserve -->` before the fence or
 * `%% planlet-direction: preserve` inside the diagram source.
 */
export const LEARNING_MAP_SECTIONS = [
  "Learning Map",
  "Learning Map Diagram",
  "Concept Map",
  "Knowledge Map",
] as const;

function normalizeSectionTitle(title: string): string {
  return title.trim().toLowerCase();
}

const LEARNING_MAP_SECTION_TITLES = new Set(
  LEARNING_MAP_SECTIONS.map(normalizeSectionTitle),
);

export function isLearningMapSection(title: string): boolean {
  return LEARNING_MAP_SECTION_TITLES.has(normalizeSectionTitle(title));
}
