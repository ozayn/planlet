export type DiagramAssetBinding = {
  source: string;
  assetName: string;
};

function safeAssetName(value: string): string | null {
  const normalized = value
    .trim()
    .replace(/\.(?:svg|png|mmd)$/i, "")
    .replace(/^assets\//i, "");

  return /^[a-z0-9][a-z0-9_-]{0,80}$/i.test(normalized)
    ? normalized
    : null;
}

export function diagramAssetNameFromSource(source: string): string | null {
  const declared = source.match(
    /^\s*%%\s*(?:asset|asset-name)\s*:\s*([^\s]+)\s*$/im,
  )?.[1];

  return declared ? safeAssetName(declared) : null;
}

export function buildMermaidDiagramAssetBindings(
  markdown: string,
): DiagramAssetBinding[] {
  const sources = [...markdown.matchAll(/```mermaid\s*\n([\s\S]*?)```/gi)]
    .map((match) => match[1]?.trim() ?? "")
    .filter(Boolean);

  return sources.map((source, index) => ({
    source,
    assetName:
      diagramAssetNameFromSource(source) ??
      (sources.length === 1 ? "diagram" : `diagram-${index + 1}`),
  }));
}
