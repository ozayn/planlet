import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseLifeLabFrontmatter } from "@/lib/life-lab/frontmatter";
import {
  buildLifeLabImageCaption,
  collectLifeLabImageDetailRows,
  extractVisualAnchorSection,
  lifeLabNoteImageAlt,
  normalizeLifeLabNoteImage,
  resolveLifeLabNoteImage,
} from "@/lib/life-lab/note-image";

describe("life lab note image metadata", () => {
  it("parses nested image frontmatter fields", () => {
    const content = `---
type: youtube-learning
image:
  title: Portrait of the Shah
  source: Wikimedia Commons
  url: https://upload.wikimedia.org/wikipedia/commons/example.jpg
  license: CC BY-SA 4.0
  credit: Jane Doe
  alt: Portrait of Mohammad Reza Shah
---

# Note title
`;

    const parsed = parseLifeLabFrontmatter(content);

    assert.equal(parsed.metadata.image?.title, "Portrait of the Shah");
    assert.equal(parsed.metadata.image?.source, "Wikimedia Commons");
    assert.equal(
      parsed.metadata.image?.url,
      "https://upload.wikimedia.org/wikipedia/commons/example.jpg",
    );
    assert.equal(parsed.metadata.image?.license, "CC BY-SA 4.0");
    assert.equal(parsed.metadata.image?.credit, "Jane Doe");
    assert.equal(parsed.metadata.image?.alt, "Portrait of Mohammad Reza Shah");
    assert.equal(parsed.body.startsWith("# Note title"), true);
  });

  it("parses youtube_thumbnail frontmatter", () => {
    const content = `---
youtube_thumbnail:
  url: https://i.ytimg.com/vi/abc123/hqdefault.jpg
  alt: Video still
---

# Note title
`;

    const parsed = parseLifeLabFrontmatter(content);

    assert.equal(
      parsed.metadata.youtube_thumbnail?.url,
      "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
    );
    assert.equal(parsed.metadata.youtube_thumbnail?.alt, "Video still");
  });

  it("prefers image.url over youtube_thumbnail.url", () => {
    const resolved = resolveLifeLabNoteImage({
      image: {
        url: "https://example.com/representative.jpg",
        title: "Representative",
      },
      youtube_thumbnail: {
        url: "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
      },
    });

    assert.equal(resolved?.url, "https://example.com/representative.jpg");
    assert.equal(resolved?.kind, "image");
    assert.equal(resolved?.title, "Representative");
  });

  it("falls back to youtube_thumbnail when image is missing", () => {
    const resolved = resolveLifeLabNoteImage({
      youtube_thumbnail: {
        url: "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
      },
    });

    assert.equal(resolved?.url, "https://i.ytimg.com/vi/abc123/hqdefault.jpg");
    assert.equal(resolved?.kind, "youtube_thumbnail");
  });

  it("rejects unsafe image urls and javascript payloads", () => {
    assert.equal(
      normalizeLifeLabNoteImage({
        url: "javascript:alert(1)",
        alt: "Bad",
      }),
      undefined,
    );
    assert.equal(
      resolveLifeLabNoteImage({
        image: {
          url: "javascript:alert(1)",
          alt: "Bad",
        },
        youtube_thumbnail: {
          url: "javascript:alert(1)",
        },
      }),
      null,
    );
  });

  it("builds compact concept captions without license or urls", () => {
    assert.equal(
      buildLifeLabImageCaption({
        url: "https://example.com/image.jpg",
        kind: "image",
        title: "The Two Fridas",
        credit: "Frida Kahlo",
        license: "CC BY-SA 4.0",
      }),
      "The Two Fridas · Frida Kahlo",
    );

    assert.equal(
      buildLifeLabImageCaption({
        url: "https://example.com/image.jpg",
        kind: "image",
        title: "The Two Fridas",
        source: "Wikimedia Commons",
        credit: "Diego Rivera",
      }),
      "The Two Fridas · Wikimedia Commons / Diego Rivera",
    );
  });

  it("uses a fixed caption for youtube thumbnails", () => {
    assert.equal(
      buildLifeLabImageCaption({
        url: "https://i.ytimg.com/vi/abc/hqdefault.jpg",
        kind: "youtube_thumbnail",
        title: "fallback visual anchor",
        license: "for preview use only",
      }),
      "YouTube thumbnail",
    );
  });

  it("extracts Visual anchor content for details only", () => {
    const body = [
      "## At a glance",
      "",
      "Summary",
      "",
      "## Visual anchor",
      "",
      "- Image: The Two Fridas",
      "- Why this image: shows duality",
      "",
      "## Short version",
      "",
      "More summary",
    ].join("\n");

    assert.equal(
      extractVisualAnchorSection(body),
      "- Image: The Two Fridas\n- Why this image: shows duality",
    );
  });

  it("collects full image metadata for collapsed details", () => {
    const rows = collectLifeLabImageDetailRows({
      metadata: {
        image: {
          url: "https://upload.wikimedia.org/wikipedia/commons/two-fridas.jpg",
          title: "The Two Fridas",
          source: "Wikimedia Commons",
          credit: "Frida Kahlo",
          license: "CC BY-SA 4.0",
        },
      },
      visualAnchorContent: "- Why this image: shows duality",
    });

    assert.deepEqual(
      rows.map((row) => row.label),
      [
        "Image title",
        "Image source",
        "Credit",
        "License",
        "Image URL",
        "Why this image",
      ],
    );
    assert.equal(rows.at(-1)?.value, "- Why this image: shows duality");
  });

  it("prefers explicit alt text for accessibility", () => {
    assert.equal(
      lifeLabNoteImageAlt({
        url: "https://example.com/image.jpg",
        alt: "Portrait of the Shah",
        title: "The Shah",
      }),
      "Portrait of the Shah",
    );
    assert.equal(
      lifeLabNoteImageAlt(
        {
          url: "https://example.com/image.jpg",
        },
        { fallbackTitle: "Episode title" },
      ),
      "Episode title",
    );
    assert.equal(
      lifeLabNoteImageAlt(
        {
          url: "https://i.ytimg.com/vi/abc/hqdefault.jpg",
        },
        { isYoutubeThumbnail: true },
      ),
      "Video thumbnail",
    );
  });
});
