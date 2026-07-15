import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseLifeLabFrontmatter } from "@/lib/life-lab/frontmatter";
import { processLifeLabNoteContent } from "@/lib/life-lab/enrichment";
import {
  extractSourceUrlFromBody,
  getSourceLinkAriaLabel,
  getSourceLinkLabel,
  getSourcePlatformLabel,
  isSafeHttpUrl,
  normalizeSourceUrl,
  resolveLifeLabSourceUrl,
  stripSourceUrlLineFromMarkdown,
} from "@/lib/life-lab/source-url";

describe("life lab source url", () => {
  it("parses sourceUrl from frontmatter", () => {
    const parsed = parseLifeLabFrontmatter(`---
sourceType: youtube
sourceUrl: https://www.youtube.com/watch?v=abc123
---
# Video note
`);

    assert.equal(
      parsed.metadata.source_url,
      "https://www.youtube.com/watch?v=abc123",
    );
    assert.equal(parsed.metadata.source, "youtube");
  });

  it("accepts youtu.be links from frontmatter", () => {
    const parsed = parseLifeLabFrontmatter(`---
video_url: https://youtu.be/abc123
---
# Video note
`);

    assert.equal(parsed.metadata.source_url, "https://youtu.be/abc123");
  });

  it("accepts markdown-link Source lines and first youtube URL fallback", () => {
    assert.equal(
      extractSourceUrlFromBody(
        "Source: [Open](https://www.youtube.com/watch?v=abc123XYZ01)",
      ),
      "https://www.youtube.com/watch?v=abc123XYZ01",
    );
    assert.equal(
      extractSourceUrlFromBody(
        "Intro text\n\nhttps://youtu.be/def456UVW02\n\nMore notes",
      ),
      "https://youtu.be/def456UVW02",
    );
  });

  it("reads camelCase sourceUrl from metadata", () => {
    assert.equal(
      resolveLifeLabSourceUrl({
        metadata: { sourceUrl: "https://www.youtube.com/watch?v=metaCamel" },
      }),
      "https://www.youtube.com/watch?v=metaCamel",
    );
  });

  it("extracts Source lines from the markdown body as fallback", () => {
    const body = `# Video note

Source: https://www.youtube.com/watch?v=fallback123

## Summary

Main content.`;

    assert.equal(
      extractSourceUrlFromBody(body),
      "https://www.youtube.com/watch?v=fallback123",
    );
    assert.equal(
      resolveLifeLabSourceUrl({ metadata: {}, body }),
      "https://www.youtube.com/watch?v=fallback123",
    );
  });

  it("prefers frontmatter over body Source lines", () => {
    const body = `Source: https://www.youtube.com/watch?v=body

Content.`;

    assert.equal(
      resolveLifeLabSourceUrl({
        metadata: { source_url: "https://www.youtube.com/watch?v=meta" },
        body,
      }),
      "https://www.youtube.com/watch?v=meta",
    );
  });

  it("rejects unsafe javascript URLs", () => {
    assert.equal(normalizeSourceUrl("javascript:alert(1)"), null);
    assert.equal(normalizeSourceUrl("data:text/html,hello"), null);
    assert.equal(
      resolveLifeLabSourceUrl({
        metadata: { source_url: "javascript:alert(1)" },
      }),
      null,
    );
  });

  it("strips duplicate Source lines from display markdown", () => {
    const url = "https://www.youtube.com/watch?v=abc123";
    const stripped = stripSourceUrlLineFromMarkdown(
      `# Title\n\nSource: ${url}\n\nBody text.`,
      url,
    );

    assert.doesNotMatch(stripped, /Source:/);
    assert.match(stripped, /Body text\./);
  });

  it("merges body fallback URLs into note metadata during enrichment", () => {
    const processed = processLifeLabNoteContent(
      {
        slug: "videos__sample",
        title: "Sample",
        excerpt: "",
        modifiedAt: null,
        modifiedAtLabel: null,
        dateLabel: null,
        subfolderLabel: "videos",
        fileId: "file-1",
        relativePath: "videos/sample.md",
        mimeType: "text/markdown",
        fileSizeBytes: null,
      },
      `# Sample video

Source: https://youtu.be/xyz789

Notes.`,
    );

    assert.equal(processed.metadata?.source_url, "https://youtu.be/xyz789");
  });

  it("infers platform labels from hostnames", () => {
    assert.equal(
      getSourcePlatformLabel("https://www.youtube.com/watch?v=1"),
      "YouTube",
    );
    assert.equal(getSourcePlatformLabel("https://youtu.be/abc"), "YouTube");
    assert.equal(getSourcePlatformLabel("https://vimeo.com/123"), "Vimeo");
    assert.equal(getSourcePlatformLabel("https://example.com/video"), "Source");
  });

  it("builds compact source link labels and accessible names", () => {
    assert.equal(
      getSourceLinkLabel("YouTube"),
      "YouTube · Open original ↗",
    );
    assert.equal(getSourceLinkLabel("Source"), "Open video ↗");
    assert.equal(
      getSourceLinkAriaLabel("YouTube"),
      "Open original YouTube video",
    );
  });

  it("allows only http and https URLs", () => {
    assert.equal(isSafeHttpUrl("https://youtube.com/watch?v=1"), true);
    assert.equal(isSafeHttpUrl("http://youtube.com/watch?v=1"), true);
    assert.equal(isSafeHttpUrl("ftp://youtube.com/watch?v=1"), false);
  });

  it("returns null when no source URL is present", () => {
    assert.equal(resolveLifeLabSourceUrl({ metadata: {}, body: "# Plain note" }), null);
  });
});
