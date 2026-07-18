export type PreparedMermaidSvg = {
  html: string;
  minWidth: number | null;
};

function parseSvgLength(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseFloat(value.replace(/px$/i, "").trim());

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeMermaidLabelStyleAttribute(style: string): string {
  return style
    .replace(/white-space:\s*nowrap/gi, "white-space:normal")
    .replace(/max-width:\s*\d+px/gi, "max-width:none")
    .replace(/text-overflow:\s*ellipsis/gi, "text-overflow:unset")
    .replace(/overflow:\s*hidden/gi, "overflow:visible");
}

export function fixMermaidHtmlLabelStyles(svgString: string): string {
  return svgString.replace(/style="([^"]*)"/g, (match, style: string) => {
    if (
      !/nowrap|max-width|ellipsis|overflow:\s*hidden/i.test(style)
    ) {
      return match;
    }

    const normalized = normalizeMermaidLabelStyleAttribute(style);

    return normalized === style ? match : `style="${normalized}"`;
  });
}

export function sanitizeGeneratedMermaidSvg(svgString: string): string | null {
  if (!/<svg\b/i.test(svgString) || /<script\b/i.test(svgString)) {
    return null;
  }

  return svgString
    .replace(/<(?:iframe|object|embed)\b[\s\S]*?<\/(?:iframe|object|embed)>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(["'])[\s\S]*?\1/gi, "")
    .replace(
      /\s+(?:href|xlink:href)\s*=\s*(["'])(?!#)[^"']*\1/gi,
      "",
    );
}

export function prepareMermaidSvg(svgString: string): PreparedMermaidSvg {
  const viewBoxMatch = svgString.match(/viewBox=(["'])([^"']+)\1/i);
  const viewBoxParts = viewBoxMatch?.[2]?.split(/\s+/).map(Number) ?? [];
  const viewWidth = viewBoxParts[2] ?? 0;
  const viewHeight = viewBoxParts[3] ?? 0;

  let html = fixMermaidHtmlLabelStyles(svgString);

  if (viewWidth > 0 && viewHeight > 0) {
    const widthMatch = html.match(/\bwidth=(["'])([^"']+)\1/i);
    const heightMatch = html.match(/\bheight=(["'])([^"']+)\1/i);
    const attrWidth = parseSvgLength(widthMatch?.[2]);
    const attrHeight = parseSvgLength(heightMatch?.[2]);

    if (attrWidth < viewWidth) {
      html = html.replace(
        /\bwidth=(["'])[^"']*\1/i,
        `width="${Math.round(viewWidth)}"`,
      );
    }

    if (attrHeight < viewHeight) {
      html = html.replace(
        /\bheight=(["'])[^"']*\1/i,
        `height="${Math.round(viewHeight)}"`,
      );
    }
  }

  return {
    html,
    minWidth: viewWidth > 0 ? viewWidth : null,
  };
}

export function mermaidSvgHasVisibleContent(svgString: string): boolean {
  const hasNodeShapes =
    /class=(["'])[^"']*\bnode\b/i.test(svgString) ||
    /<rect\b/i.test(svgString) ||
    /<polygon\b/i.test(svgString) ||
    /<ellipse\b/i.test(svgString);

  const hasLabels =
    /<text\b/i.test(svgString) ||
    /<tspan\b/i.test(svgString) ||
    /<foreignObject\b/i.test(svgString);

  return hasNodeShapes && hasLabels;
}
