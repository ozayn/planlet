export type DiagramProvider = "mermaid" | "mind-map" | "emotion-graph";

export type DiagramExportFormat = "png" | "svg" | "source";

export type DiagramAssetUrls = Partial<
  Record<DiagramExportFormat, string>
>;

export type DiagramExportInput = {
  provider: DiagramProvider;
  title: string;
  source: string;
  sourceExtension: string;
  svg: string;
  preferredAssetUrls?: DiagramAssetUrls;
};

const MAX_PNG_DIMENSION = 8192;
const MAX_PNG_PIXELS = 48_000_000;
const PNG_SCALE = 3;
const PREFERRED_ASSET_CACHE = new Map<string, Promise<Blob | null>>();

export function diagramExportFilename(
  title: string,
  extension: string,
): string {
  const basename = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${basename || "diagram"}.${extension.replace(/^\./, "")}`;
}

export function diagramSourceBlob(source: string): Blob {
  return new Blob([source.trimEnd(), "\n"], {
    type: "text/plain;charset=utf-8",
  });
}

export function diagramSvgBlob(svg: string): Blob {
  return new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
}

export function resolvePngExportDimensions(input: {
  width: number;
  height: number;
  scale?: number;
}): { width: number; height: number; scale: number } {
  const width = Math.max(1, input.width);
  const height = Math.max(1, input.height);
  const requestedScale = Math.max(1, input.scale ?? PNG_SCALE);
  const dimensionScale = Math.min(
    requestedScale,
    MAX_PNG_DIMENSION / width,
    MAX_PNG_DIMENSION / height,
  );
  const pixelScale = Math.sqrt(MAX_PNG_PIXELS / (width * height));
  const scale = Math.max(0.01, Math.min(dimensionScale, pixelScale));

  return {
    width: Math.floor(width * scale),
    height: Math.floor(height * scale),
    scale,
  };
}

function svgDimensions(svg: string): { width: number; height: number } {
  const viewBox = svg.match(/\bviewBox=["']([^"']+)["']/i)?.[1];
  const values = viewBox?.trim().split(/\s+/).map(Number) ?? [];
  const viewWidth = values[2];
  const viewHeight = values[3];

  if (
    Number.isFinite(viewWidth) &&
    Number.isFinite(viewHeight) &&
    viewWidth! > 0 &&
    viewHeight! > 0
  ) {
    return { width: viewWidth!, height: viewHeight! };
  }

  const width = Number.parseFloat(
    svg.match(/\bwidth=["']([^"']+)["']/i)?.[1] ?? "1200",
  );
  const height = Number.parseFloat(
    svg.match(/\bheight=["']([^"']+)["']/i)?.[1] ?? "800",
  );

  return {
    width: Number.isFinite(width) && width > 0 ? width : 1200,
    height: Number.isFinite(height) && height > 0 ? height : 800,
  };
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function fetchPreferredDiagramAsset(
  url: string | undefined,
): Promise<Blob | null> {
  if (!url) {
    return null;
  }

  const cached = PREFERRED_ASSET_CACHE.get(url);

  if (cached) {
    return cached;
  }

  const request = fetch(url)
    .then((response) => (response.ok ? response.blob() : null))
    .catch(() => null);
  PREFERRED_ASSET_CACHE.set(url, request);
  return request;
}

export function clearPreferredDiagramAssetCache(): void {
  PREFERRED_ASSET_CACHE.clear();
}

async function pngBlobFromSvg(svg: string): Promise<Blob> {
  const source = diagramSvgBlob(svg);
  const sourceUrl = URL.createObjectURL(source);

  try {
    const image = new Image();
    image.decoding = "async";
    image.src = sourceUrl;
    await image.decode();

    const natural = svgDimensions(svg);
    const dimensions = resolvePngExportDimensions(natural);
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("PNG export is unavailable in this browser.");
    }

    context.setTransform(
      dimensions.scale,
      0,
      0,
      dimensions.scale,
      0,
      0,
    );
    context.drawImage(image, 0, 0, natural.width, natural.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png", 1),
    );

    if (!blob) {
      throw new Error("PNG export could not be created.");
    }

    return blob;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export async function downloadDiagramExport(
  input: DiagramExportInput,
  format: DiagramExportFormat,
): Promise<void> {
  const extension =
    format === "source" ? input.sourceExtension : format;
  const preferred = await fetchPreferredDiagramAsset(
    input.preferredAssetUrls?.[format],
  );
  const blob =
    preferred ??
    (format === "source"
      ? diagramSourceBlob(input.source)
      : format === "svg"
        ? diagramSvgBlob(input.svg)
        : await pngBlobFromSvg(input.svg));

  triggerBlobDownload(blob, diagramExportFilename(input.title, extension));
}

export async function copyDiagramSource(source: string): Promise<void> {
  await navigator.clipboard.writeText(source.trimEnd());
}
