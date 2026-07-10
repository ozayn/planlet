export type MermaidLabelWrapOptions = {
  maxCharactersPerLine: number;
  maxLines: number;
};

const FLOWCHART_HEADER_PATTERN = /^(graph|flowchart)\s+/i;

const NON_FLOWCHART_DIAGRAM_PATTERN =
  /^(sequenceDiagram|stateDiagram-v2|stateDiagram|classDiagram|mindmap|timeline|gantt|erDiagram|pie|gitGraph|C4Context|block-beta|journey|zenuml|architecture-beta|quadrantChart|requirementDiagram|sankey-beta|xychart-beta)/i;

const FLOWCHART_QUOTED_LABEL_PATTERNS = [
  /\b([\w-]+)(\s*\[\[)(")([^"]+)("\]\])/g,
  /\b([\w-]+)(\s*\[\()(")([^"]+)("\)\])/g,
  /\b([\w-]+)(\s*\[)(")([^"]+)("\])/g,
  /\b([\w-]+)(\s*\()(")([^"]+)("\))/g,
] as const;

const EXPLICIT_BREAK_PATTERN = /<br\s*\/?>/i;
const URL_PATTERN = /^https?:\/\//i;

function isFlowchartSource(source: string): boolean {
  const firstMeaningfulLine = source
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("%%"));

  if (!firstMeaningfulLine) {
    return false;
  }

  if (NON_FLOWCHART_DIAGRAM_PATTERN.test(firstMeaningfulLine)) {
    return false;
  }

  return FLOWCHART_HEADER_PATTERN.test(firstMeaningfulLine);
}

function isUrlLike(text: string): boolean {
  return URL_PATTERN.test(text.trim());
}

function wrapWords(
  text: string,
  { maxCharactersPerLine, maxLines }: MermaidLabelWrapOptions,
): string {
  const words = text.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return text;
  }

  if (words.length === 1 && words[0].length <= maxCharactersPerLine) {
    return text;
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (candidate.length <= maxCharactersPerLine) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;

    if (lines.length >= maxLines - 1) {
      const remainingIndex = words.indexOf(word);
      const remainder = words.slice(remainingIndex).join(" ");
      lines.push(remainder);
      return lines.slice(0, maxLines).join("<br/>");
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length <= 1) {
    return lines[0] ?? text;
  }

  return lines.slice(0, maxLines).join("<br/>");
}

function wrapLabelText(
  text: string,
  options: MermaidLabelWrapOptions,
): string {
  if (isUrlLike(text)) {
    return text;
  }

  if (EXPLICIT_BREAK_PATTERN.test(text)) {
    return text;
  }

  return wrapWords(text, options);
}

function wrapQuotedNodeLabel(
  label: string,
  options: MermaidLabelWrapOptions,
): string {
  const wrapped = wrapLabelText(label, options);

  if (wrapped === label) {
    return label;
  }

  return wrapped;
}

export function wrapMermaidNodeLabels(
  source: string,
  options: MermaidLabelWrapOptions,
): string {
  if (!isFlowchartSource(source)) {
    return source;
  }

  let result = source;

  for (const pattern of FLOWCHART_QUOTED_LABEL_PATTERNS) {
    result = result.replace(
      pattern,
      (match, nodeId, bracketPart, openQuote, label, closePart) => {
        const wrappedLabel = wrapQuotedNodeLabel(label, options);

        if (wrappedLabel === label) {
          return match;
        }

        return `${nodeId}${bracketPart}${openQuote}${wrappedLabel}${closePart}`;
      },
    );
  }

  return result;
}

export function prepareMermaidSourceForRender(
  source: string,
  options: MermaidLabelWrapOptions,
): string {
  return wrapMermaidNodeLabels(source.trim(), options);
}
