import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  prepareMermaidSourceForRender,
  wrapMermaidNodeLabels,
} from "@/lib/life-lab/mermaid-label-wrap";

const SAMPLE_FLOWCHART = `flowchart TD
  A["Inference to the best explanation"]
  B["Mental capacities of a P-functioning body"]
  C["Does a nonphysical soul explain this feature better?"]
  A --> B --> C`;

describe("life lab mermaid label wrap", () => {
  it("wraps long quoted flowchart node labels with br breaks", () => {
    const wrapped = wrapMermaidNodeLabels(SAMPLE_FLOWCHART, {
      maxCharactersPerLine: 24,
      maxLines: 3,
    });

    assert.match(wrapped, /A\["Inference to the best<br\/>explanation"\]/);
    assert.match(
      wrapped,
      /B\["Mental capacities of a<br\/>P-functioning body"\]/,
    );
    assert.match(
      wrapped,
      /C\["Does a nonphysical soul<br\/>explain this feature<br\/>better\?"\]/,
    );
    assert.match(wrapped, /A --> B --> C/);
  });

  it("preserves explicit br breaks inside labels", () => {
    const source = `flowchart TD
  A["Inference to the<br/>best explanation"]`;

    const wrapped = wrapMermaidNodeLabels(source, {
      maxCharactersPerLine: 12,
      maxLines: 3,
    });

    assert.match(wrapped, /Inference to the<br\/>best explanation/);
    assert.doesNotMatch(wrapped, /Inference to<br\/>the<br\/>best/);
  });

  it("does not wrap short labels or URLs", () => {
    const source = `flowchart TD
  A["Short label"]
  B["https://example.com/watch?v=abc"]`;

    const wrapped = wrapMermaidNodeLabels(source, {
      maxCharactersPerLine: 24,
      maxLines: 3,
    });

    assert.match(wrapped, /A\["Short label"\]/);
    assert.match(wrapped, /B\["https:\/\/example.com\/watch\?v=abc"\]/);
  });

  it("leaves non-flowchart diagrams unchanged", () => {
    const source = `sequenceDiagram
  Alice->>Bob: Hello`;

    const wrapped = wrapMermaidNodeLabels(source, {
      maxCharactersPerLine: 24,
      maxLines: 3,
    });

    assert.equal(wrapped, source);
  });

  it("does not split words character-by-character", () => {
    const source = `flowchart TD
  A["Supercalifragilisticexpialidocious explanation"]`;

    const wrapped = wrapMermaidNodeLabels(source, {
      maxCharactersPerLine: 12,
      maxLines: 2,
    });

    assert.match(
      wrapped,
      /A\["Supercalifragilisticexpialidocious<br\/>explanation"\]/,
    );
  });

  it("prepares render source with inline wrap defaults", () => {
    const prepared = prepareMermaidSourceForRender(SAMPLE_FLOWCHART, {
      maxCharactersPerLine: 24,
      maxLines: 3,
    });

    assert.match(prepared, /<br\/>/);
    assert.match(prepared, /^flowchart TD/);
  });
});
