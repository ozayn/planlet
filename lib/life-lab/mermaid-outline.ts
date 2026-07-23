/**
 * Lightweight Mermaid outline for Learning Map compact preview.
 * Avoids rendering Mermaid for first paint.
 */

export function extractMermaidCode(content: string): string | null {
  const match = content.match(/```mermaid\s*\n([\s\S]*?)```/i);

  return match?.[1]?.trim() ?? null;
}

const NODE_LABEL_PATTERNS = [
  /\b[\w-]+\s*\[\[["']([^"'\]]+)["']\]\]/g,
  /\b[\w-]+\s*\[\(["']([^"'\)]+)["']\)\]/g,
  /\b[\w-]+\s*\[["']([^"'\]]+)["']\]/g,
  /\b[\w-]+\s*\(["']([^"'\)]+)["']\)/g,
  /\b[\w-]+\s*\[\[([^\]\n]+)\]\]/g,
  /\b[\w-]+\s*\[\(([^\)\n]+)\)\]/g,
  /\b[\w-]+\s*\[([^\]"'\n]+)\]/g,
  /\b[\w-]+\s*\(([^\)"'\n]+)\)/g,
] as const;

function cleanLabel(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractMermaidOutlineLabels(
  mermaidSource: string,
  options: { limit?: number } = {},
): string[] {
  const limit = options.limit ?? 12;
  const labels: string[] = [];
  const seen = new Set<string>();

  for (const pattern of NODE_LABEL_PATTERNS) {
    pattern.lastIndex = 0;
    let match = pattern.exec(mermaidSource);

    while (match) {
      const label = cleanLabel(match[1] ?? "");

      if (
        label &&
        label.length > 1 &&
        !/^(graph|flowchart|TD|LR|RL|BT|TB)$/i.test(label)
      ) {
        const key = label.toLowerCase();

        if (!seen.has(key)) {
          seen.add(key);
          labels.push(label);
        }
      }

      if (labels.length >= limit) {
        return labels;
      }

      match = pattern.exec(mermaidSource);
    }
  }

  return labels;
}
