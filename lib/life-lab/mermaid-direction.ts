import { isLearningMapSection } from "@/lib/life-lab/learning-map-sections";

export const MERMAID_DIRECTION_PRESERVE_HTML =
  "<!-- planlet:mermaid-direction=preserve -->";

export const MERMAID_DIRECTION_PRESERVE_COMMENT =
  "%% planlet-direction: preserve";

const MERMAID_FENCE_PATTERN = /```mermaid\s*\n([\s\S]*?)```/g;

const NON_FLOWCHART_DIAGRAM_PATTERN =
  /^(sequenceDiagram|stateDiagram-v2|stateDiagram|classDiagram|mindmap|timeline|gantt|erDiagram|pie|gitGraph|C4Context|block-beta|journey|zenuml|architecture-beta|quadrantChart|requirementDiagram|sankey-beta|xychart-beta)/i;

const HORIZONTAL_FLOWCHART_DIRECTION_PATTERN =
  /^(\s*)(graph|flowchart)(\s+)(LR|RL)\b/i;

type MarkdownRange = {
  start: number;
  end: number;
};

function listLearningMapContentRanges(body: string): MarkdownRange[] {
  const headingPattern = /^(#{1,6})\s+(.+?)\s*$/gm;
  const headings = [...body.matchAll(headingPattern)];
  const ranges: MarkdownRange[] = [];

  for (let index = 0; index < headings.length; index += 1) {
    const match = headings[index];
    const level = match[1].length;
    const title = match[2].trim();

    if (!isLearningMapSection(title)) {
      continue;
    }

    const contentStart = (match.index ?? 0) + match[0].length;
    let contentEnd = body.length;

    for (let nextIndex = index + 1; nextIndex < headings.length; nextIndex += 1) {
      const nextMatch = headings[nextIndex];

      if (nextMatch[1].length <= level) {
        contentEnd = nextMatch.index ?? body.length;
        break;
      }
    }

    ranges.push({ start: contentStart, end: contentEnd });
  }

  return ranges;
}

function isOffsetInRanges(offset: number, ranges: MarkdownRange[]): boolean {
  return ranges.some((range) => offset >= range.start && offset < range.end);
}

export function hasMermaidDirectionPreserveMarker(
  precedingContent: string,
  source: string,
): boolean {
  if (/%%\s*planlet-direction\s*:\s*preserve/i.test(source)) {
    return true;
  }

  return /<!--\s*planlet:mermaid-direction\s*=\s*preserve\s*-->\s*$/i.test(
    precedingContent.trimEnd(),
  );
}

export function normalizeFlowchartDirectionToVertical(source: string): string {
  const lines = source.split("\n");

  if (lines.length === 0) {
    return source;
  }

  const trimmedFirstLine = lines[0].trim();

  if (NON_FLOWCHART_DIAGRAM_PATTERN.test(trimmedFirstLine)) {
    return source;
  }

  const match = lines[0].match(HORIZONTAL_FLOWCHART_DIRECTION_PATTERN);

  if (!match) {
    return source;
  }

  lines[0] = lines[0].replace(
    HORIZONTAL_FLOWCHART_DIRECTION_PATTERN,
    "$1$2$3TD",
  );

  return lines.join("\n");
}

export function normalizeLearningMapArtifactMarkdown(body: string): string {
  return body.replace(MERMAID_FENCE_PATTERN, (match, source) => {
    if (hasMermaidDirectionPreserveMarker("", source)) {
      return match;
    }

    const normalizedSource = normalizeFlowchartDirectionToVertical(source);

    if (normalizedSource === source) {
      return match;
    }

    return `\`\`\`mermaid\n${normalizedSource}\`\`\``;
  });
}

export function normalizeLearningMapMermaidInMarkdown(body: string): string {
  const learningMapRanges = listLearningMapContentRanges(body);

  if (learningMapRanges.length === 0) {
    return body;
  }

  return body.replace(MERMAID_FENCE_PATTERN, (match, source, offset) => {
    if (!isOffsetInRanges(offset, learningMapRanges)) {
      return match;
    }

    const precedingContent = body.slice(0, offset);

    if (hasMermaidDirectionPreserveMarker(precedingContent, source)) {
      return match;
    }

    const normalizedSource = normalizeFlowchartDirectionToVertical(source);

    if (normalizedSource === source) {
      return match;
    }

    return `\`\`\`mermaid\n${normalizedSource}\`\`\``;
  });
}

export {
  isLearningMapSection,
  LEARNING_MAP_SECTIONS,
} from "@/lib/life-lab/learning-map-sections";
