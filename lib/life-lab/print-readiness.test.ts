import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  LIFE_LAB_PRINT_TOTAL_TIMEOUT_MS,
  isImageReady,
  isMermaidNodeReady,
  shouldProceedWithPrint,
  type LifeLabPrintReadinessSnapshot,
} from "@/lib/life-lab/print-readiness";

function snapshot(
  overrides: Partial<LifeLabPrintReadinessSnapshot> = {},
): LifeLabPrintReadinessSnapshot {
  return {
    mermaidTotal: 0,
    mermaidReady: 0,
    mermaidBusy: 0,
    imagesTotal: 0,
    imagesReady: 0,
    imagesPending: 0,
    fontsReady: true,
    essentialReady: true,
    ...overrides,
  };
}

describe("life lab print readiness", () => {
  it("proceeds immediately when essential content is ready", () => {
    const decision = shouldProceedWithPrint({
      snapshot: snapshot({ essentialReady: true }),
      elapsedMs: 40,
    });

    assert.equal(decision.proceed, true);
    assert.equal(decision.reason, "essential-ready");
  });

  it("does not wait forever for busy Mermaid or pending images", () => {
    const waiting = shouldProceedWithPrint({
      snapshot: snapshot({
        mermaidTotal: 1,
        mermaidReady: 0,
        mermaidBusy: 1,
        imagesTotal: 1,
        imagesReady: 0,
        imagesPending: 1,
        fontsReady: false,
        essentialReady: false,
      }),
      elapsedMs: 200,
    });
    assert.equal(waiting.proceed, false);

    const afterGates = shouldProceedWithPrint({
      snapshot: snapshot({
        mermaidTotal: 1,
        mermaidReady: 0,
        mermaidBusy: 1,
        imagesTotal: 1,
        imagesReady: 0,
        imagesPending: 1,
        fontsReady: false,
        essentialReady: false,
      }),
      elapsedMs: 4_100,
    });
    assert.equal(afterGates.proceed, true);
    assert.match(afterGates.reason, /timeout/);

    const hard = shouldProceedWithPrint({
      snapshot: snapshot({
        mermaidBusy: 1,
        imagesPending: 1,
        fontsReady: false,
        essentialReady: false,
      }),
      elapsedMs: LIFE_LAB_PRINT_TOTAL_TIMEOUT_MS,
    });
    assert.equal(hard.proceed, true);
    assert.equal(hard.reason, "total-timeout");
  });

  it("treats failed images and idle mermaid nodes as ready", () => {
    const brokenImage = {
      complete: true,
      naturalWidth: 0,
    } as HTMLImageElement;
    assert.equal(isImageReady(brokenImage), true);

    const busy = {
      getAttribute: (name: string) => (name === "aria-busy" ? "true" : null),
      querySelector: () => null,
      classList: { contains: () => false },
      closest: () => null,
    } as unknown as Element;
    assert.equal(isMermaidNodeReady(busy), false);

    const idleWithoutSvg = {
      getAttribute: () => "false",
      querySelector: () => null,
      classList: { contains: () => false },
      closest: () => null,
    } as unknown as Element;
    assert.equal(isMermaidNodeReady(idleWithoutSvg), true);

    const withSvg = {
      getAttribute: () => "false",
      querySelector: (selector: string) =>
        selector.includes("svg") ? {} : null,
      classList: { contains: () => false },
      closest: () => null,
    } as unknown as Element;
    assert.equal(isMermaidNodeReady(withSvg), true);
  });

  it("bounds print auto-trigger waits and logs readiness gates", () => {
    const root = join(process.cwd());
    const trigger = readFileSync(
      join(root, "components/life-lab/life-lab-print-auto-trigger.tsx"),
      "utf8",
    );
    const mermaid = readFileSync(
      join(root, "components/life-lab/mermaid-block.tsx"),
      "utf8",
    );
    const readiness = readFileSync(
      join(root, "lib/life-lab/print-readiness.ts"),
      "utf8",
    );

    assert.match(trigger, /shouldProceedWithPrint/);
    assert.match(trigger, /logLifeLabPrintReadiness/);
    assert.match(trigger, /LIFE_LAB_PRINT_TOTAL_TIMEOUT_MS/);
    assert.doesNotMatch(trigger, /12_000|12000/);
    assert.match(trigger, /Opening print dialog/);
    assert.match(readiness, /LIFE_LAB_PRINT_MERMAID_TIMEOUT_MS = 4_000/);
    assert.match(readiness, /LIFE_LAB_PRINT_TOTAL_TIMEOUT_MS = 5_000/);
    assert.match(readiness, /data-life-lab-print-document/);
    assert.match(mermaid, /data-life-lab-note-view='print'/);
  });
});
