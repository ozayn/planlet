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
import { parseLifeLabFrontmatter } from "@/lib/life-lab/frontmatter";
import { buildNarrationDocument } from "@/lib/life-lab/narration-text";
import { buildNoteSearchText } from "@/lib/life-lab/search";
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

  it("removes implementation rows without hiding reader-facing metadata", () => {
    const body = [
      "## At a glance",
      "",
      "| Field | Value |",
      "| --- | --- |",
      "| Show | The Daily |",
      "| Transcript source | Local Whisper transcription |",
      "| Whisper model | large-v3 |",
      "| Chunk count | 14 |",
      "| Publication date | 2026-07-18 |",
      "",
      "## Summary",
      "",
      "A reader-facing explanation.",
      "",
      "Note: Local Whisper transcription was generated from an optimized 16 kHz mono file.",
      "",
      "Working folder: /tmp/life-lab/video-intake/_working/episode-42",
    ].join("\n");

    const prepared = prepareLifeLabMarkdownForReading(body);
    const hidden = extractTechnicalProvenanceForDebug(body);

    assert.match(prepared, /The Daily/);
    assert.match(prepared, /Publication date/);
    assert.match(prepared, /reader-facing explanation/);
    assert.doesNotMatch(prepared, /Transcript source|Whisper model|Chunk count/i);
    assert.doesNotMatch(prepared, /Local Whisper|Working folder|16 kHz/i);
    assert.ok(hidden.some((entry) => /Transcript source/i.test(entry)));
    assert.ok(hidden.some((entry) => /Working folder/i.test(entry)));
  });

  it("keeps technical details out of search indexes", () => {
    const searchText = buildNoteSearchText({
      title: "A visible title",
      slug: "internal-episode-id-991",
      relativePath: "_working/internal-episode-id-991.md",
      subfolderLabel: "Podcasts",
      searchText: "Reader-facing summary",
      metadata: {
        transcription_method: "Local Whisper transcription",
        note_profile: "internal-pipeline-v4",
        input_source: "rss-retrieval-job",
        source_notes: ["audio optimized to 16 kHz mono"],
      },
    });

    assert.match(searchText, /visible title/);
    assert.match(searchText, /reader-facing summary/);
    assert.doesNotMatch(searchText, /whisper|pipeline|rss-retrieval|16 khz/i);
    assert.doesNotMatch(searchText, /internal-episode-id|_working/i);
  });

  it("never includes Technical details in narration", () => {
    const content = [
      "## Summary",
      "",
      "Visible summary.",
      "",
      "## Technical details",
      "",
      "Whisper model: large-v3",
    ].join("\n");

    const speech = prepareNoteSpeechText("Sample", content);

    assert.match(speech, /Visible summary/);
    assert.doesNotMatch(speech, /Technical details|Whisper model|large-v3/i);
  });

  it("collects frontmatter provenance once and hides expanded variants", () => {
    const parsed = parseLifeLabFrontmatter(`---
transcription_method: Local Whisper transcription
chunk_count: 14
working_folder: /tmp/big-audio/episode-42
---
## At a glance

| Field | Value |
| --- | --- |
| Topic | Monetary policy |
| Transcription method | Local Whisper transcription |
| Big Audio | enabled |
| Chunk processing | 14 chunks |

## Processing metadata

Internal ID: episode-42`);
    const prepared = prepareLifeLabMarkdownForReading(parsed.body);
    const hidden = extractTechnicalProvenanceForDebug(
      parsed.body,
      parsed.technicalProvenance,
    );

    assert.match(prepared, /Monetary policy/);
    assert.doesNotMatch(
      prepared,
      /Local Whisper|Big Audio|Chunk processing|Internal ID/i,
    );
    assert.equal(
      hidden.filter((entry) => /Local Whisper transcription/i.test(entry))
        .length,
      1,
    );
    assert.ok(
      hidden.some(
        (entry) => /Chunk processing/i.test(entry) && /\b14\b/.test(entry),
      ),
    );
    assert.ok(hidden.some((entry) => /Working folder:/i.test(entry)));
  });
});
