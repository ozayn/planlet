/**
 * Fit Life Lab Mermaid / Learning Map diagrams into a single printable page.
 * Prefer shrinking the SVG layout box (not cropping) so page breaks stay correct.
 */

/** Letter page with @page margins 18mm / 16mm, at 96 CSS px/in. */
const MM_TO_PX = 96 / 25.4;
const LETTER_WIDTH_MM = 215.9;
const LETTER_HEIGHT_MM = 279.4;
const PAGE_MARGIN_Y_MM = 18;
const PAGE_MARGIN_X_MM = 16;
/** Slightly tighter usable height for diagram pages. */
const DIAGRAM_MARGIN_TIGHTEN_MM = 4;

export const LIFE_LAB_PRINT_CONTENT_WIDTH_PX = Math.floor(
  (LETTER_WIDTH_MM - PAGE_MARGIN_X_MM * 2) * MM_TO_PX,
);

export const LIFE_LAB_PRINT_CONTENT_HEIGHT_PX = Math.floor(
  (LETTER_HEIGHT_MM - PAGE_MARGIN_Y_MM * 2) * MM_TO_PX,
);

export const LIFE_LAB_PRINT_DIAGRAM_PAGE_HEIGHT_PX = Math.floor(
  (LETTER_HEIGHT_MM - (PAGE_MARGIN_Y_MM - DIAGRAM_MARGIN_TIGHTEN_MM) * 2) *
    MM_TO_PX,
);

export type PrintDiagramFitInput = {
  diagramWidth: number;
  diagramHeight: number;
  availableWidth: number;
  availableHeight: number;
};

export function computePrintDiagramScale(input: PrintDiagramFitInput): number {
  const { diagramWidth, diagramHeight, availableWidth, availableHeight } =
    input;

  if (
    diagramWidth <= 0 ||
    diagramHeight <= 0 ||
    availableWidth <= 0 ||
    availableHeight <= 0
  ) {
    return 1;
  }

  const scale = Math.min(
    1,
    availableWidth / diagramWidth,
    availableHeight / diagramHeight,
  );

  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

export function computePrintDiagramAvailableHeight(input: {
  pageContentHeight: number;
  headingHeight: number;
  gap?: number;
}): number {
  const gap = input.gap ?? 16;
  return Math.max(120, input.pageContentHeight - input.headingHeight - gap);
}

export function measureSvgNaturalSize(svg: SVGSVGElement): {
  width: number;
  height: number;
} {
  const viewBox = svg.viewBox?.baseVal;
  if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
    return { width: viewBox.width, height: viewBox.height };
  }

  try {
    const box = svg.getBBox();
    if (box.width > 0 && box.height > 0) {
      return { width: box.width, height: box.height };
    }
  } catch {
    // Not rendered / empty.
  }

  const widthAttr = Number.parseFloat(svg.getAttribute("width") ?? "");
  const heightAttr = Number.parseFloat(svg.getAttribute("height") ?? "");
  if (widthAttr > 0 && heightAttr > 0) {
    return { width: widthAttr, height: heightAttr };
  }

  const rect = svg.getBoundingClientRect();
  return {
    width: rect.width > 0 ? rect.width : 1,
    height: rect.height > 0 ? rect.height : 1,
  };
}

function resetPrintFit(svg: SVGSVGElement, wrap: HTMLElement | null) {
  svg.style.width = "";
  svg.style.height = "";
  svg.style.maxWidth = "";
  svg.style.maxHeight = "";
  svg.style.transform = "";
  svg.removeAttribute("data-life-lab-print-diagram-scale");

  if (!wrap) {
    return;
  }

  wrap.style.height = "";
  wrap.style.width = "";
  wrap.style.display = "";
  wrap.style.justifyContent = "";
  wrap.style.overflow = "";
  wrap.classList.remove("ui-mermaid-print-fit");
}

/**
 * Scale each print diagram unit so heading + SVG fit on one page when possible.
 */
export function fitLifeLabPrintDiagrams(root: ParentNode = document): void {
  const scope =
    (root as ParentNode & { querySelector?: typeof document.querySelector })
      .querySelector?.("[data-life-lab-print-document]") ?? root;

  const units = [
    ...scope.querySelectorAll("[data-life-lab-print-diagram-unit]"),
  ];

  for (const unit of units) {
    if (!(unit instanceof HTMLElement)) {
      continue;
    }

    const svg = unit.querySelector(
      ".ui-mermaid-svg svg, .ui-mermaid svg",
    ) as SVGSVGElement | null;

    if (!svg) {
      continue;
    }

    const wrap =
      (svg.closest(".ui-mermaid-svg, .ui-mermaid-scroll") as HTMLElement | null) ??
      (svg.parentElement as HTMLElement | null);

    resetPrintFit(svg, wrap);

    const caption = unit.querySelector(
      "[data-life-lab-print-diagram-caption], h2, h3",
    );
    const captionHeight =
      caption instanceof HTMLElement
        ? caption.getBoundingClientRect().height
        : 0;

    const availableHeight = computePrintDiagramAvailableHeight({
      pageContentHeight: LIFE_LAB_PRINT_DIAGRAM_PAGE_HEIGHT_PX,
      headingHeight: captionHeight,
    });
    const availableWidth = Math.min(
      LIFE_LAB_PRINT_CONTENT_WIDTH_PX,
      unit.getBoundingClientRect().width || LIFE_LAB_PRINT_CONTENT_WIDTH_PX,
    );

    const natural = measureSvgNaturalSize(svg);
    const scale = computePrintDiagramScale({
      diagramWidth: natural.width,
      diagramHeight: natural.height,
      availableWidth,
      availableHeight,
    });

    const width = natural.width * scale;
    const height = natural.height * scale;

    svg.style.width = `${width}px`;
    svg.style.height = `${height}px`;
    svg.style.maxWidth = "100%";
    svg.style.maxHeight = "none";
    svg.setAttribute("data-life-lab-print-diagram-scale", String(scale));

    if (wrap) {
      wrap.classList.add("ui-mermaid-print-fit");
      wrap.style.display = "flex";
      wrap.style.justifyContent = "center";
      wrap.style.width = "100%";
      wrap.style.height = `${height}px`;
      wrap.style.overflow = "visible";
    }

    // Keep scroll shells from clipping scaled SVGs in print.
    const mermaid = unit.querySelector(".ui-mermaid");
    if (mermaid instanceof HTMLElement) {
      mermaid.style.overflow = "visible";
      mermaid.style.maxHeight = "none";
      mermaid.style.height = "auto";
    }

    const scroll = unit.querySelector(".ui-mermaid-scroll");
    if (scroll instanceof HTMLElement) {
      scroll.style.overflow = "visible";
      scroll.style.maxHeight = "none";
      scroll.style.height = "auto";
    }
  }
}
