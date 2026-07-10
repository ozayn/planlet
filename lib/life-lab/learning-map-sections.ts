/**
 * Headings whose Mermaid flowcharts should default to top-down layout.
 *
 * Authoring contract (Ava / OpenClaw):
 * - Use `flowchart TD` or `graph TD` unless horizontal layout is intentional.
 *   Add `<!-- planlet:mermaid-direction=preserve -->` before the fence or
 *   `%% planlet-direction: preserve` inside the diagram source when keeping LR/RL.
 * - Keep node labels concise — roughly 5–7 words when possible.
 * - Use `<br/>` only for a deliberate semantic line break inside a label.
 * - Avoid full explanatory sentences inside nodes; put longer context in Markdown.
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
