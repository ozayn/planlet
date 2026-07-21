export type DiagramAssetBinding = {
  source: string;
  diagramId: string;
  assetName: string;
  savedAssetName: string | null;
};

function safeAssetName(value: string): string | null {
  const normalized = value
    .trim()
    .replace(/\.(?:svg|png|mmd)$/i, "")
    .replace(/^assets\//i, "")
    .toLowerCase();

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

export function diagramIdFromSource(source: string): string | null {
  const declared = source.match(
    /^\s*%%\s*(?:diagram-id|diagram-name)\s*:\s*([^\s]+)\s*$/im,
  )?.[1];

  return declared ? safeAssetName(declared) : null;
}

function headingDiagramId(markdown: string, fenceIndex: number): string | null {
  const preceding = markdown.slice(0, fenceIndex);
  const headings = [
    ...preceding.matchAll(/^#{2,4}\s+(.+?)\s*#*\s*$/gm),
  ];
  const heading = headings.at(-1)?.[1]
    ?.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .trim();

  return heading ? safeAssetName(heading.replace(/[^a-z0-9]+/gi, "-")) : null;
}

export function buildMermaidDiagramAssetBindings(
  markdown: string,
): DiagramAssetBinding[] {
  const matches = [
    ...markdown.matchAll(/```mermaid[^\S\r\n]*\r?\n([\s\S]*?)```/gi),
  ].filter((match) => Boolean(match[1]?.trim()));
  const idCounts = new Map<string, number>();

  return matches.map((match, index) => {
    const source = match[1]!.trim();
    const savedAssetName = diagramAssetNameFromSource(source);
    const baseId =
      diagramIdFromSource(source) ??
      headingDiagramId(markdown, match.index ?? 0) ??
      `diagram-${index + 1}`;
    const count = (idCounts.get(baseId) ?? 0) + 1;
    idCounts.set(baseId, count);
    const diagramId = count === 1 ? baseId : `${baseId}-${count}`;

    return {
      source,
      diagramId,
      assetName: savedAssetName ?? diagramId,
      savedAssetName,
    };
  });
}
