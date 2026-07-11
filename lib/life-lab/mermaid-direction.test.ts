import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hasMermaidDirectionPreserveMarker,
  normalizeFlowchartDirectionToVertical,
  normalizeLearningMapArtifactMarkdown,
  normalizeLearningMapMermaidInMarkdown,
} from "@/lib/life-lab/mermaid-direction";

describe("life lab mermaid direction", () => {
  it("rewrites Learning Map graph LR to graph TD", () => {
    const body = [
      "## Learning Map",
      "",
      "```mermaid",
      "graph LR",
      "  A[Postwar consumer boom] --> B[Mass media and advertising]",
      "  B --> C[Pop Art]",
      "  C --> D[Warhol silkscreen]",
      "```",
    ].join("\n");

    const normalized = normalizeLearningMapMermaidInMarkdown(body);

    assert.match(normalized, /graph TD/);
    assert.doesNotMatch(normalized, /graph LR/);
    assert.match(normalized, /A\[Postwar consumer boom\]/);
  });

  it("rewrites Learning Map flowchart RL to flowchart TD", () => {
    const body = [
      "## Concept Map",
      "",
      "```mermaid",
      "flowchart RL",
      "  A --> B",
      "```",
    ].join("\n");

    const normalized = normalizeLearningMapMermaidInMarkdown(body);

    assert.match(normalized, /flowchart TD/);
    assert.doesNotMatch(normalized, /flowchart RL/);
  });

  it("leaves ordinary Mermaid graph LR unchanged outside Learning Map sections", () => {
    const body = [
      "## Summary",
      "",
      "```mermaid",
      "graph LR",
      "  A --> B",
      "```",
    ].join("\n");

    const normalized = normalizeLearningMapMermaidInMarkdown(body);

    assert.match(normalized, /graph LR/);
    assert.doesNotMatch(normalized, /graph TD/);
  });

  it("keeps horizontal layout when the HTML preserve marker is present", () => {
    const body = [
      "## Learning Map",
      "",
      "<!-- planlet:mermaid-direction=preserve -->",
      "```mermaid",
      "graph LR",
      "  A --> B",
      "```",
    ].join("\n");

    const normalized = normalizeLearningMapMermaidInMarkdown(body);

    assert.match(normalized, /graph LR/);
    assert.doesNotMatch(normalized, /graph TD/);
  });

  it("keeps horizontal layout when the Mermaid preserve comment is present", () => {
    const body = [
      "## Knowledge Map",
      "",
      "```mermaid",
      "%% planlet-direction: preserve",
      "flowchart LR",
      "  A --> B",
      "```",
    ].join("\n");

    const normalized = normalizeLearningMapMermaidInMarkdown(body);

    assert.match(normalized, /flowchart LR/);
    assert.doesNotMatch(normalized, /flowchart TD/);
  });

  it("does not rewrite non-flowchart Mermaid syntax", () => {
    const body = [
      "## Learning Map",
      "",
      "```mermaid",
      "sequenceDiagram",
      "  Alice->>Bob: Hello",
      "```",
    ].join("\n");

    const normalized = normalizeLearningMapMermaidInMarkdown(body);

    assert.match(normalized, /sequenceDiagram/);
    assert.doesNotMatch(normalized, /graph TD/);
    assert.doesNotMatch(normalized, /flowchart TD/);
  });

  it("detects preserve markers in helper checks", () => {
    assert.equal(
      hasMermaidDirectionPreserveMarker(
        "## Learning Map\n\n<!-- planlet:mermaid-direction=preserve -->",
        "graph LR\n  A --> B",
      ),
      true,
    );
    assert.equal(
      hasMermaidDirectionPreserveMarker(
        "## Learning Map\n\n",
        "%% planlet-direction: preserve\ngraph LR\n  A --> B",
      ),
      true,
    );
    assert.equal(
      hasMermaidDirectionPreserveMarker("## Learning Map\n\n", "graph LR\n  A --> B"),
      false,
    );
  });

  it("normalizes only the first flowchart direction line", () => {
    const normalized = normalizeFlowchartDirectionToVertical(
      "flowchart LR\n  A --> B",
    );

    assert.equal(normalized, "flowchart TD\n  A --> B");
  });

  it("rewrites standalone learning-map artifact mermaid blocks", () => {
    const body = [
      "```mermaid",
      "graph LR",
      "  A --> B",
      "```",
    ].join("\n");

    const normalized = normalizeLearningMapArtifactMarkdown(body);

    assert.match(normalized, /graph TD/);
    assert.doesNotMatch(normalized, /graph LR/);
  });
});
