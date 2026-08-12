import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computePrintDiagramAvailableHeight,
  computePrintDiagramScale,
  LIFE_LAB_PRINT_DIAGRAM_PAGE_HEIGHT_PX,
} from "@/lib/life-lab/print-diagram-fit";

describe("life lab print diagram fit", () => {
  it("keeps scale at 1 when the diagram already fits", () => {
    assert.equal(
      computePrintDiagramScale({
        diagramWidth: 400,
        diagramHeight: 300,
        availableWidth: 700,
        availableHeight: 900,
      }),
      1,
    );
  });

  it("scales oversized SVGs to fit width and max height", () => {
    const scale = computePrintDiagramScale({
      diagramWidth: 800,
      diagramHeight: 1400,
      availableWidth: 700,
      availableHeight: 900,
    });

    assert.ok(scale < 1);
    assert.ok(800 * scale <= 700 + 0.01);
    assert.ok(1400 * scale <= 900 + 0.01);
    // Height is the tighter constraint here.
    assert.ok(Math.abs(scale - 900 / 1400) < 0.001);
  });

  it("reserves heading space so the diagram unit can stay on one page", () => {
    const available = computePrintDiagramAvailableHeight({
      pageContentHeight: LIFE_LAB_PRINT_DIAGRAM_PAGE_HEIGHT_PX,
      headingHeight: 48,
      gap: 16,
    });

    assert.ok(available < LIFE_LAB_PRINT_DIAGRAM_PAGE_HEIGHT_PX);
    assert.equal(
      available,
      Math.max(120, LIFE_LAB_PRINT_DIAGRAM_PAGE_HEIGHT_PX - 48 - 16),
    );
  });

  it("never returns a non-positive scale", () => {
    assert.equal(
      computePrintDiagramScale({
        diagramWidth: 0,
        diagramHeight: 100,
        availableWidth: 700,
        availableHeight: 900,
      }),
      1,
    );
  });
});
