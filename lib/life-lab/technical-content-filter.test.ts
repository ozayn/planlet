import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isHiddenTechnicalHeading,
  isPreservedSourceHeading,
  isTechnicalLabelLine,
  paragraphMatchesTechnicalPhrase,
  stripPlanletHiddenBlocks,
  stripTechnicalMetadataFromMarkdown,
} from "@/lib/life-lab/hidden-markdown-sections";
import {
  extractTechnicalProvenanceForDebug,
  prepareLifeLabMarkdownForReading,
} from "@/lib/life-lab/markdown-display";
import { buildNarrationDocument } from "@/lib/life-lab/narration-text";
import { prepareNoteSpeechText } from "@/lib/life-lab/speech";
import { markdownExcerpt } from "@/lib/life-lab/slug";

const SOURCE_LIMITATION =
  "Source limitation: YouTube caption download hit HTTP 429 rate limits, so this is a first-pass note from public metadata/description plus standard historical context, not a transcript-grounded note.";

describe("life lab technical content filtering", () => {
  it("hides source limitation paragraphs from reading markdown", () => {
    const body = [
      "## Summary",
      "",
      "A concise overview.",
      "",
      SOURCE_LIMITATION,
    ].join("\n");

    const prepared = prepareLifeLabMarkdownForReading(body);

    assert.doesNotMatch(prepared, /Source limitation/i);
    assert.doesNotMatch(prepared, /HTTP 429/i);
    assert.match(prepared, /A concise overview/);
  });

  it("keeps real Sources and Further reading sections", () => {
    const body = [
      "## Sources",
      "",
      "- Plato, *Republic*",
      "",
      "## Further reading",
      "",
      "- Stanford Encyclopedia of Philosophy",
      "",
      "## Source limitation",
      "",
      "Internal only",
    ].join("\n");

    const prepared = prepareLifeLabMarkdownForReading(body);

    assert.match(prepared, /## Sources/);
    assert.match(prepared, /Plato/);
    assert.match(prepared, /## Further reading/);
    assert.doesNotMatch(prepared, /Source limitation/i);
  });

  it("strips planlet hidden blocks", () => {
    const body = [
      "Visible intro.",
      "",
      "<!-- planlet:hidden:start -->",
      SOURCE_LIMITATION,
      "<!-- planlet:hidden:end -->",
      "",
      "## Summary",
      "",
      "Still visible.",
    ].join("\n");

    const prepared = prepareLifeLabMarkdownForReading(body);
    const hidden = extractTechnicalProvenanceForDebug(body);

    assert.doesNotMatch(prepared, /HTTP 429/i);
    assert.match(prepared, /Still visible/);
    assert.ok(hidden.some((entry) => entry.includes("HTTP 429")));
  });

  it("preserves legitimate discussion of rate limits in learning content", () => {
    const body = [
      "## Summary",
      "",
      "Central banks sometimes raise interest rate limits to manage inflation.",
    ].join("\n");

    const prepared = prepareLifeLabMarkdownForReading(body);

    assert.match(prepared, /interest rate limits/i);
    assert.equal(
      paragraphMatchesTechnicalPhrase(
        "Central banks sometimes raise interest rate limits to manage inflation.",
        { allowPhraseOnly: true },
      ),
      false,
    );
  });

  it("recognizes hidden technical headings and preserved source headings", () => {
    assert.equal(isHiddenTechnicalHeading("Source limitation"), true);
    assert.equal(isHiddenTechnicalHeading("Transcript status:"), true);
    assert.equal(isPreservedSourceHeading("Sources"), true);
    assert.equal(isPreservedSourceHeading("Further reading"), true);
    assert.equal(isHiddenTechnicalHeading("Sources"), false);
  });

  it("excludes hidden technical text from narration and speech", () => {
    const content = ["## Summary", "Overview.", "", SOURCE_LIMITATION].join(
      "\n",
    );

    const sections = buildNarrationDocument({
      title: "Sample",
      content,
    });
    const speech = prepareNoteSpeechText("Sample", content);

    assert.equal(
      sections.some((section) => section.body.includes("HTTP 429")),
      false,
    );
    assert.doesNotMatch(speech, /HTTP 429/i);
    assert.doesNotMatch(speech, /first-pass note/i);
  });

  it("excludes hidden technical text from excerpts", () => {
    const excerpt = markdownExcerpt(
      prepareLifeLabMarkdownForReading(
        ["Overview paragraph.", "", SOURCE_LIMITATION].join("\n\n"),
      ),
    );

    assert.doesNotMatch(excerpt, /HTTP 429/i);
    assert.match(excerpt, /Overview paragraph/);
  });

  it("collects hidden technical provenance for debug", () => {
    const hidden = extractTechnicalProvenanceForDebug(
      ["## Extraction notes", "", "yt-dlp failed", "", SOURCE_LIMITATION].join(
        "\n",
      ),
      ["Frontmatter limitation note"],
    );

    assert.ok(hidden.some((entry) => entry.includes("Frontmatter limitation")));
    assert.ok(hidden.some((entry) => entry.includes("Extraction notes")));
    assert.ok(hidden.some((entry) => entry.includes("HTTP 429")));
  });

  it("detects technical label lines", () => {
    assert.equal(isTechnicalLabelLine("Source limitation: details"), true);
    assert.equal(isTechnicalLabelLine("**Processing notes:**"), true);
    assert.equal(isTechnicalLabelLine("Sources"), false);
  });

  it("strips hidden blocks via stripPlanletHiddenBlocks", () => {
    const split = stripPlanletHiddenBlocks(
      "Visible\n\n<!-- planlet:hidden:start -->\nHidden\n<!-- planlet:hidden:end -->",
    );

    assert.match(split.visible, /Visible/);
    assert.equal(split.hidden.length, 1);
    assert.equal(stripTechnicalMetadataFromMarkdown(SOURCE_LIMITATION), "");
  });
});
