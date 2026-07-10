import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isHiddenMarkdownSection } from "@/lib/life-lab/hidden-markdown-sections";
import {
  normalizeMarkdownListSpacing,
  prepareLifeLabMarkdownForReading,
  stripHiddenMarkdownSections,
} from "@/lib/life-lab/markdown-display";

describe("life lab markdown display", () => {
  it("recognizes hidden section titles case-insensitively", () => {
    assert.equal(isHiddenMarkdownSection("Source note"), true);
    assert.equal(isHiddenMarkdownSection("DEVELOPER INFORMATION"), true);
    assert.equal(isHiddenMarkdownSection("Visual anchor"), true);
    assert.equal(isHiddenMarkdownSection("Core argument"), false);
  });

  it("strips Visual anchor sections from markdown bodies", () => {
    const body = [
      "## At a glance",
      "",
      "- Key point",
      "",
      "## Visual anchor",
      "",
      "- Image: The Two Fridas",
      "- Why this image: shows duality",
      "",
      "## Short version",
      "",
      "Summary text",
    ].join("\n");

    const stripped = stripHiddenMarkdownSections(body);

    assert.doesNotMatch(stripped, /Visual anchor/);
    assert.doesNotMatch(stripped, /Why this image/);
    assert.match(stripped, /## At a glance/);
    assert.match(stripped, /## Short version/);
  });

  it("strips hidden h2 sections from markdown bodies", () => {
    const body = [
      "# Title",
      "",
      "## Source note",
      "",
      "Internal only",
      "",
      "## Summary",
      "",
      "- Core argument",
      "- Main lessons",
    ].join("\n");

    const stripped = stripHiddenMarkdownSections(body);

    assert.doesNotMatch(stripped, /Source note/);
    assert.match(stripped, /## Summary/);
    assert.match(stripped, /- Core argument/);
  });

  it("inserts blank lines before list blocks when needed", () => {
    const body = "**Main lessons**\n- One\n- Two";
    const normalized = normalizeMarkdownListSpacing(body);

    assert.match(normalized, /\*\*Main lessons\*\*\n\n- One/);
  });

  it("prepares markdown for reading by hiding metadata and normalizing lists", () => {
    const prepared = prepareLifeLabMarkdownForReading(
      "## Developer information\n\nDebug\n\n## Learning Map\n\n**Topics**\n- Iran\n- Borders",
    );

    assert.doesNotMatch(prepared, /Developer information/);
    assert.match(prepared, /## Learning Map/);
    assert.match(prepared, /\*\*Topics\*\*\n\n- Iran/);
  });
});
