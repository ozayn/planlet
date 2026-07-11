import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { cleanLifeLabExcerpt } from "@/lib/life-lab/excerpt";

describe("cleanLifeLabExcerpt", () => {
  it("strips html comments before truncation", () => {
    const excerpt = cleanLifeLabExcerpt(
      "<!-- planlet:hidden:start -->Status: 33 processed<!-- truncated",
      40,
    );

    assert.equal(excerpt.includes("<!"), false);
    assert.equal(excerpt.includes("<!--"), false);
    assert.equal(excerpt.includes("Status"), false);
  });

  it("removes html tags from plain-text excerpts", () => {
    assert.equal(
      cleanLifeLabExcerpt("<p>Short introductions to major figures.</p>"),
      "Short introductions to major figures.",
    );
  });

  it("never truncates in the middle of an html comment", () => {
    const excerpt = cleanLifeLabExcerpt(
      "A readable summary. <!-- hidden technical note about captions",
      30,
    );

    assert.equal(excerpt.includes("<!"), false);
    assert.match(excerpt, /A readable summary/);
  });
});
