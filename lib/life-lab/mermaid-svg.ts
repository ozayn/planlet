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

function upsertSvgStyle(svgString: string, style: string): string {
  const styleAttribute = /style=(["'])(.*?)\1/i;

  if (styleAttribute.test(svgString)) {
    return svgString.replace(styleAttribute, `style="${style}"`);
  }

  return svgString.replace(/<svg\b/i, `<svg style="${style}"`);
}

export function prepareMermaidSvg(svgString: string): PreparedMermaidSvg {
  const viewBoxMatch = svgString.match(/viewBox=(["'])([^"']+)\1/i);
  const viewBoxParts = viewBoxMatch?.[2]?.split(/\s+/).map(Number) ?? [];
  const viewWidth = viewBoxParts[2] ?? 0;
  const viewHeight = viewBoxParts[3] ?? 0;
  const widthMatch = svgString.match(/\bwidth=(["'])([^"']+)\1/i);
  const heightMatch = svgString.match(/\bheight=(["'])([^"']+)\1/i);
  const attrWidth = parseSvgLength(widthMatch?.[2]);
  const attrHeight = parseSvgLength(heightMatch?.[2]);
  const intrinsicWidth = Math.max(viewWidth, attrWidth);
  const intrinsicHeight = Math.max(viewHeight, attrHeight);

  let html = svgString
    .replace(/\s(width|height)=(["'])[^"']*\2/gi, "")
    .replace(
      /preserveAspectRatio=(["'])[^"']*\1/i,
      'preserveAspectRatio="xMinYMin meet"',
    );

  if (!/preserveAspectRatio=/i.test(html)) {
    html = html.replace(/<svg\b/i, '<svg preserveAspectRatio="xMinYMin meet"');
  }

  const styleParts = [
    "display: block",
    "width: max-content",
    "max-width: none",
    "height: auto",
  ];

  if (intrinsicWidth > 0) {
    styleParts.push(`min-width: ${Math.round(intrinsicWidth)}px`);
  }

  if (intrinsicHeight > 0) {
    styleParts.push(`min-height: ${Math.round(intrinsicHeight)}px`);
  }

  return {
    html: upsertSvgStyle(html, styleParts.join("; ")),
    minWidth: intrinsicWidth > 0 ? intrinsicWidth : null,
  };
}
