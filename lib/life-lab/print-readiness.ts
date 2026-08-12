/**
 * Bounded readiness helpers for Life Lab note PDF/print export.
 * Prefer best-effort printing over waiting on slow/failed assets.
 */

export const LIFE_LAB_PRINT_FONTS_TIMEOUT_MS = 1_500;
export const LIFE_LAB_PRINT_IMAGES_TIMEOUT_MS = 2_500;
export const LIFE_LAB_PRINT_MERMAID_TIMEOUT_MS = 4_000;
export const LIFE_LAB_PRINT_TOTAL_TIMEOUT_MS = 5_000;

export type LifeLabPrintReadinessSnapshot = {
  mermaidTotal: number;
  mermaidReady: number;
  mermaidBusy: number;
  imagesTotal: number;
  imagesReady: number;
  imagesPending: number;
  fontsReady: boolean;
  essentialReady: boolean;
};

export type LifeLabPrintReadinessLog = {
  gate: string;
  elapsedMs: number;
  detail?: string;
  snapshot?: LifeLabPrintReadinessSnapshot;
};

function isVisibleForPrint(element: Element): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  if (element.closest(".print\\:hidden, [data-life-lab-print-screen-bar]")) {
    return false;
  }

  if (element.closest(".ui-mermaid-dialog-overlay")) {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }

  return true;
}

export function listPrintMermaidNodes(root: ParentNode = document): Element[] {
  const scope =
    root.querySelector?.("[data-life-lab-print-document]") ??
    root.querySelector?.("[data-life-lab-note-view='print']") ??
    root;

  return [...scope.querySelectorAll(".ui-mermaid")].filter(isVisibleForPrint);
}

export function isMermaidNodeReady(node: Element): boolean {
  if (node.querySelector(".ui-mermaid-svg svg, .ui-mermaid-svg > svg")) {
    return true;
  }

  // Failed/fallback diagrams should not block export.
  if (
    node.classList.contains("ui-mermaid-fallback") ||
    node.querySelector(".ui-mermaid-fallback") ||
    node.closest(".ui-mermaid-fallback")
  ) {
    return true;
  }

  // Empty/missing diagram after render attempt: treat as ready if not busy.
  if (node.getAttribute("aria-busy") !== "true") {
    return true;
  }

  return false;
}

export function listPrintImages(root: ParentNode = document): HTMLImageElement[] {
  const scope =
    root.querySelector?.("[data-life-lab-print-document]") ??
    root.querySelector?.("[data-life-lab-note-view='print']") ??
    root;

  return [...scope.querySelectorAll("img")].filter(
    (image): image is HTMLImageElement =>
      image instanceof HTMLImageElement && isVisibleForPrint(image),
  );
}

export function isImageReady(image: HTMLImageElement): boolean {
  if (image.complete) {
    // complete + naturalWidth 0 usually means failed/broken — still "ready"
    // so broken thumbs do not block print.
    return true;
  }

  return false;
}

export function capturePrintReadinessSnapshot(
  root: ParentNode = document,
  fontsReady = true,
): LifeLabPrintReadinessSnapshot {
  const mermaidNodes = listPrintMermaidNodes(root);
  const mermaidReady = mermaidNodes.filter(isMermaidNodeReady).length;
  const mermaidBusy = mermaidNodes.length - mermaidReady;
  const images = listPrintImages(root);
  const imagesReady = images.filter(isImageReady).length;
  const imagesPending = images.length - imagesReady;

  return {
    mermaidTotal: mermaidNodes.length,
    mermaidReady,
    mermaidBusy,
    imagesTotal: images.length,
    imagesReady,
    imagesPending,
    fontsReady,
    essentialReady: mermaidBusy === 0 && imagesPending === 0 && fontsReady,
  };
}

export function shouldProceedWithPrint(input: {
  snapshot: LifeLabPrintReadinessSnapshot;
  elapsedMs: number;
  fontsTimeoutMs?: number;
  imagesTimeoutMs?: number;
  mermaidTimeoutMs?: number;
  totalTimeoutMs?: number;
}): { proceed: boolean; reason: string } {
  const {
    snapshot,
    elapsedMs,
    fontsTimeoutMs = LIFE_LAB_PRINT_FONTS_TIMEOUT_MS,
    imagesTimeoutMs = LIFE_LAB_PRINT_IMAGES_TIMEOUT_MS,
    mermaidTimeoutMs = LIFE_LAB_PRINT_MERMAID_TIMEOUT_MS,
    totalTimeoutMs = LIFE_LAB_PRINT_TOTAL_TIMEOUT_MS,
  } = input;

  if (snapshot.essentialReady) {
    return { proceed: true, reason: "essential-ready" };
  }

  if (elapsedMs >= totalTimeoutMs) {
    return { proceed: true, reason: "total-timeout" };
  }

  const fontsOk = snapshot.fontsReady || elapsedMs >= fontsTimeoutMs;
  const imagesOk =
    snapshot.imagesPending === 0 || elapsedMs >= imagesTimeoutMs;
  const mermaidOk =
    snapshot.mermaidBusy === 0 || elapsedMs >= mermaidTimeoutMs;

  if (fontsOk && imagesOk && mermaidOk) {
    return {
      proceed: true,
      reason:
        snapshot.essentialReady
          ? "essential-ready"
          : "gated-timeouts-satisfied",
    };
  }

  return { proceed: false, reason: "waiting" };
}

export function logLifeLabPrintReadiness(
  entry: LifeLabPrintReadinessLog,
): void {
  if (typeof console === "undefined" || typeof console.info !== "function") {
    return;
  }

  console.info("[life-lab-print]", entry.gate, {
    elapsedMs: entry.elapsedMs,
    detail: entry.detail,
    snapshot: entry.snapshot,
  });
}
