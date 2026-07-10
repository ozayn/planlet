import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseLifeLabFrontmatter } from "@/lib/life-lab/frontmatter";
import {
  buildLifeLabImageCaption,
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
    assert.equal(resolved?.source, "image");
    assert.equal(resolved?.title, "Representative");
  });

  it("falls back to youtube_thumbnail when image is missing", () => {
    const resolved = resolveLifeLabNoteImage({
      youtube_thumbnail: {
        url: "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
      },
    });

    assert.equal(resolved?.url, "https://i.ytimg.com/vi/abc123/hqdefault.jpg");
    assert.equal(resolved?.source, "youtube_thumbnail");
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

  it("builds captions from title, credit, and license only", () => {
    assert.equal(
      buildLifeLabImageCaption({
        url: "https://example.com/image.jpg",
        title: "The Shah's portrait",
        credit: "Jane Doe",
        license: "CC BY-SA 4.0",
        source: "https://commons.wikimedia.org",
      }),
      "The Shah's portrait · Jane Doe · CC BY-SA 4.0",
    );
    assert.equal(
      buildLifeLabImageCaption({
        url: "https://example.com/image.jpg",
      }),
      null,
    );
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
