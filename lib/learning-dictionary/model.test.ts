import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import { parseLifeLabFrontmatter } from "@/lib/life-lab/frontmatter";
import {
  classifyDictionaryNoteGroup,
  isDictionaryEntryNote,
  resolveDictionaryCategory,
  resolveDictionaryEntryType,
  resolveDictionaryLanguage,
} from "@/lib/life-lab/learning-dictionary";
import {
  collectDictionaryBrowseCards,
  dictionaryNoteMatchesQuery,
  findRelatedDictionaryEntries,
  toDictionaryCardModel,
} from "@/lib/learning-dictionary/model";

function note(
  partial: Partial<LifeLabNoteSummary> & Pick<LifeLabNoteSummary, "slug" | "title">,
): LifeLabNoteSummary {
  return {
    excerpt: "",
    modifiedAt: "2026-07-10T12:00:00.000Z",
    modifiedAtLabel: "Jul 10",
    dateLabel: null,
    subfolderLabel: null,
    fileId: partial.fileId ?? `file-${partial.slug}`,
    relativePath: partial.relativePath ?? `${partial.slug}.md`,
    ...partial,
  };
}

describe("learning dictionary browsing", () => {
  it("discovers nested language and category folders", () => {
    assert.equal(
      isDictionaryEntryNote({
        relativePath: "english/phrases/break-the-ice.md",
      }),
      true,
    );
    assert.equal(
      resolveDictionaryLanguage({
        relativePath: "english/phrases/break-the-ice.md",
      }),
      "english",
    );
    assert.equal(
      resolveDictionaryCategory({
        relativePath: "english/phrases/break-the-ice.md",
      }),
      "phrases",
    );
    assert.equal(
      classifyDictionaryNoteGroup(
        note({
          slug: "english__phrases__break-the-ice",
          title: "Break the ice",
          relativePath: "english/phrases/break-the-ice.md",
        }),
      ),
      "phrases",
    );
  });

  it("resolves entry types from frontmatter", () => {
    assert.equal(
      resolveDictionaryEntryType({
        metadata: { type: "phrase" },
      }),
      "phrase",
    );
    assert.equal(
      resolveDictionaryEntryType({
        metadata: { type: "organization" },
        relativePath: "organizations/un.md",
      }),
      "organization",
    );
    assert.equal(
      resolveDictionaryEntryType({
        metadata: { type: "dictionary-entry", category: "person" },
      }),
      "person",
    );
  });

  it("parses expanded frontmatter fields", () => {
    const raw = `---
type: phrase
language: english
display_title: Break the ice
aliases:
  - ice-breaker phrase
meaning: Start a conversation in a social setting.
occurrences: 4
source_notes:
  - reading-briefs/sample.md
tags:
  - social
study_status: studying
---

# Break the ice
`;
    const { metadata } = parseLifeLabFrontmatter(raw);

    assert.equal(metadata.display_title, "Break the ice");
    assert.deepEqual(metadata.aliases, ["ice-breaker phrase"]);
    assert.equal(metadata.meaning, "Start a conversation in a social setting.");
    assert.equal(metadata.occurrences, 4);
    assert.deepEqual(metadata.source_notes, ["reading-briefs/sample.md"]);
  });

  it("builds cards that retain thumbnail-related browse fields", () => {
    const card = toDictionaryCardModel(
      note({
        slug: "english__phrases__break-the-ice",
        title: "Break the ice",
        relativePath: "english/phrases/break-the-ice.md",
        excerpt: "Start a conversation.",
        metadata: {
          type: "phrase",
          language: "english",
          tags: ["social", "speaking", "warmth", "extra"],
          study_status: "new",
          occurrences: 3,
          source_notes: ["a.md", "b.md"],
          thumbnailUrl: "https://example.com/thumb.jpg",
        },
      }),
    );

    assert.ok(card);
    assert.equal(card?.href, "/learning-dictionary/english__phrases__break-the-ice");
    assert.equal(card?.typeLabel, "Phrase");
    assert.equal(card?.languageLabel, "English");
    assert.equal(card?.tags.length, 3);
    assert.equal(card?.occurrences, 3);
    assert.equal(card?.sourceCount, 2);
    assert.equal(card?.thumbnailUrl, "https://example.com/thumb.jpg");
  });

  it("supports fuzzy title search and preserves related entries", () => {
    const legitimacy = note({
      slug: "concepts__political-legitimacy",
      title: "Political legitimacy",
      relativePath: "concepts/political-legitimacy.md",
      metadata: {
        type: "concept",
        tags: ["authority"],
        related: ["succession"],
        source_notes: ["briefs/iran.md"],
      },
    });
    const succession = note({
      slug: "concepts__succession",
      title: "Succession",
      relativePath: "concepts/succession.md",
      metadata: {
        type: "concept",
        tags: ["authority"],
        source_notes: ["briefs/iran.md"],
      },
    });

    assert.equal(dictionaryNoteMatchesQuery(legitimacy, "legitimacy"), true);
    assert.equal(dictionaryNoteMatchesQuery(legitimacy, "legitmacy"), true);

    const related = findRelatedDictionaryEntries(legitimacy, [
      legitimacy,
      succession,
    ]);

    assert.equal(related[0]?.slug, "concepts__succession");
    assert.ok(related[0]?.reason);

    const cards = collectDictionaryBrowseCards([legitimacy, succession], {
      query: "succession",
      category: "concepts",
      language: "all",
      status: "all",
      sort: "alpha",
    });

    assert.ok(cards.some((card) => card.slug === "concepts__succession"));
    assert.equal(
      cards.every((card) => card.href.startsWith("/learning-dictionary/")),
      true,
    );
  });
});
