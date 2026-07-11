import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  fixMermaidHtmlLabelStyles,
  prepareMermaidSvg,
} from "@/lib/life-lab/mermaid-svg";

describe("life lab mermaid svg", () => {
  it("removes nowrap and max-width clipping from html label styles", () => {
    const svg = `<svg><foreignObject><div xmlns="http://www.w3.org/1999/xhtml" style="display: table-cell; white-space: nowrap; line-height: 1.5; max-width: 180px; text-align: center;"><span class="nodeLabel">Heuristics and subconscious processing</span></div></foreignObject></svg>`;

    const fixed = fixMermaidHtmlLabelStyles(svg);

    assert.match(fixed, /white-space:normal/i);
    assert.match(fixed, /max-width:none/i);
    assert.doesNotMatch(fixed, /nowrap/i);
    assert.doesNotMatch(fixed, /ellipsis/i);
  });

  it("normalizes label styles while expanding undersized svg dimensions", () => {
    const prepared = prepareMermaidSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 640 120"><foreignObject><div style="white-space: nowrap; max-width: 180px;">Label</div></foreignObject></svg>',
    );

    assert.match(prepared.html, /viewBox=["']0 0 640 120["']/);
    assert.match(prepared.html, /width=["']640["']/);
    assert.match(prepared.html, /height=["']120["']/);
    assert.match(prepared.html, /white-space:normal/i);
    assert.match(prepared.html, /max-width:none/i);
    assert.equal(prepared.minWidth, 640);
  });
});
