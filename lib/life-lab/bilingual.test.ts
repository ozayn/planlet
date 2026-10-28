import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  bilingualAvailabilityLabel,
  collapseNotesByTranslationGroup,
  collectTranslationSiblings,
  noteTranslationDedupeKey,
  parseLanguageSuffixFromFilename,
  resolveNoteContentLanguage,
  resolveTranslationGroupId,
  stripLanguageSuffixFromPath,
} from "@/lib/life-lab/bilingual";
import { buildNoteItemKey } from "@/lib/life-lab/item-key";
import { noteMatchesSearch } from "@/lib/life-lab/search";
import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";

function note(input: {
  slug: string;
  relativePath: string;
  title?: string;
  fileId?: string;
  language?: string;
  sourceLanguage?: string;
  translationGroupId?: string;
  alternate?: string;
  searchText?: string;
}): LifeLabNoteSummary {
  return {
    slug: input.slug,
    title: input.title ?? input.slug,
    excerpt: "",
    modifiedAt: null,
    modifiedAtLabel: null,
    dateLabel: null,
    subfolderLabel: null,
    fileId: input.fileId ?? input.slug,
    relativePath: input.relativePath,
    searchText: input.searchText,
    metadata: {
      language: input.language,
      source_language: input.sourceLanguage,
      translation_group_id: input.translationGroupId,
      alternate_language_note: input.alternate,
    },
  };
}

describe("life lab bilingual notes", () => {
  it("parses language suffixes from filenames", () => {
    assert.equal(parseLanguageSuffixFromFilename("topic.en.md"), "en");
    assert.equal(parseLanguageSuffixFromFilename("topic.fa.md"), "fa");
    assert.equal(parseLanguageSuffixFromFilename("topic.md"), null);
    assert.equal(
      stripLanguageSuffixFromPath("notes/topic.en.md"),
      "notes/topic",
    );
  });

  it("prefers frontmatter language and translation_group_id", () => {
    const en = note({
      slug: "history.en",
      relativePath: "history.en.md",
      language: "en",
      sourceLanguage: "fa",
      translationGroupId: "history-of-science",
      alternate: "history.fa.md",
    });
    const fa = note({
      slug: "history.fa",
      relativePath: "history.fa.md",
      language: "fa",
      sourceLanguage: "fa",
      translationGroupId: "history-of-science",
      alternate: "history.en.md",
    });

    assert.equal(resolveNoteContentLanguage(en), "en");
    assert.equal(resolveNoteContentLanguage(fa), "fa");
    assert.equal(resolveTranslationGroupId(en), "history-of-science");
    assert.equal(
      noteTranslationDedupeKey(en),
      noteTranslationDedupeKey(fa),
    );
  });

  it("links filename twins without translation_group_id", () => {
    const en = note({
      slug: "topic__en",
      relativePath: "topic.en.md",
      language: "en",
    });
    const fa = note({
      slug: "topic__fa",
      relativePath: "topic.fa.md",
      language: "fa",
    });

    assert.equal(noteTranslationDedupeKey(en), noteTranslationDedupeKey(fa));
    assert.equal(
      buildNoteItemKey({
        sectionId: "lecture-notes",
        relativePath: en.relativePath,
        slug: en.slug,
        metadata: en.metadata,
      }),
      buildNoteItemKey({
        sectionId: "lecture-notes",
        relativePath: fa.relativePath,
        slug: fa.slug,
        metadata: fa.metadata,
      }),
    );
  });

  it("keeps legacy single-language notes independent", () => {
    const legacy = note({
      slug: "solo",
      relativePath: "solo.md",
      title: "Solo note",
    });

    assert.equal(resolveNoteContentLanguage(legacy), null);
    assert.equal(noteTranslationDedupeKey(legacy), null);
    assert.equal(
      collapseNotesByTranslationGroup([legacy]).length,
      1,
    );
  });

  it("collapses bilingual pairs to one library card with availability label", () => {
    const en = note({
      slug: "history.en",
      relativePath: "history.en.md",
      title: "History of Science in Islamic Civilization",
      language: "en",
      sourceLanguage: "fa",
      translationGroupId: "history-of-science",
      searchText: "technological determinism",
    });
    const fa = note({
      slug: "history.fa",
      relativePath: "history.fa.md",
      title: "تاریخ علم در تمدن اسلامی",
      language: "fa",
      sourceLanguage: "fa",
      translationGroupId: "history-of-science",
      searchText: "جبرگرایی فناورانه",
    });

    const collapsed = collapseNotesByTranslationGroup([en, fa, note({
      slug: "other",
      relativePath: "other.md",
      title: "Other",
    })]);

    assert.equal(collapsed.length, 2);
    const bilingual = collapsed.find((entry) =>
      entry.metadata?.translation_group_id === "history-of-science",
    );
    assert.ok(bilingual);
    assert.equal(bilingual?.slug, "history.en");
    assert.equal(
      bilingual?.bilingualAvailabilityLabel,
      bilingualAvailabilityLabel(["en", "fa"], "fa"),
    );
    assert.match(bilingual?.bilingualAvailabilityLabel ?? "", /Persian source/);
    assert.match(bilingual?.bilingualAvailabilityLabel ?? "", /English \+ فارسی/);
  });

  it("prefers Persian card when reading language is fa", () => {
    const en = note({
      slug: "history.en",
      relativePath: "history.en.md",
      language: "en",
      translationGroupId: "history-of-science",
    });
    const fa = note({
      slug: "history.fa",
      relativePath: "history.fa.md",
      language: "fa",
      translationGroupId: "history-of-science",
    });

    const collapsed = collapseNotesByTranslationGroup([en, fa], "fa");
    assert.equal(collapsed[0]?.slug, "history.fa");
  });

  it("collects translation siblings from group id and alternate path", () => {
    const en = note({
      slug: "history.en",
      relativePath: "history.en.md",
      language: "en",
      translationGroupId: "history-of-science",
      alternate: "history.fa.md",
    });
    const fa = note({
      slug: "history.fa",
      relativePath: "history.fa.md",
      language: "fa",
      translationGroupId: "history-of-science",
      alternate: "history.en.md",
    });

    const siblings = collectTranslationSiblings([en, fa], en);
    assert.deepEqual(
      siblings.map((sibling) => sibling.language),
      ["en", "fa"],
    );
  });

  it("searches English and Persian bodies without double-counting after collapse", () => {
    const en = note({
      slug: "history.en",
      relativePath: "history.en.md",
      title: "History of Science",
      language: "en",
      translationGroupId: "history-of-science",
      searchText: "technological determinism shapes society",
    });
    const fa = note({
      slug: "history.fa",
      relativePath: "history.fa.md",
      title: "تاریخ علم",
      language: "fa",
      translationGroupId: "history-of-science",
      searchText: "جبرگرایی فناورانه عامل تعیین‌کننده است",
    });

    assert.equal(noteMatchesSearch(en, "technological determinism"), true);
    assert.equal(noteMatchesSearch(fa, "جبرگرایی"), true);
    assert.equal(noteMatchesSearch(en, "جبرگرایی"), false);

    const matched = [en, fa].filter(
      (entry) =>
        noteMatchesSearch(entry, "technological") ||
        noteMatchesSearch(entry, "جبرگرایی"),
    );
    const collapsed = collapseNotesByTranslationGroup(matched);
    assert.equal(collapsed.length, 1);
  });

  it("shares study identity across languages", () => {
    const enKey = buildNoteItemKey({
      sectionId: "lecture-notes",
      relativePath: "history.en.md",
      slug: "history.en",
      metadata: {
        language: "en",
        translation_group_id: "history-of-science",
      },
    });
    const faKey = buildNoteItemKey({
      sectionId: "lecture-notes",
      relativePath: "history.fa.md",
      slug: "history.fa",
      metadata: {
        language: "fa",
        translation_group_id: "history-of-science",
      },
    });

    assert.equal(enKey, faKey);
    assert.equal(enKey, "lecture-notes:tg:history-of-science");
  });

  it("handles missing translation by keeping the available note", () => {
    const faOnly = note({
      slug: "history.fa",
      relativePath: "history.fa.md",
      language: "fa",
      translationGroupId: "history-of-science",
    });

    const collapsed = collapseNotesByTranslationGroup([faOnly]);
    assert.equal(collapsed.length, 1);
    assert.equal(collapsed[0]?.slug, "history.fa");
    assert.equal(collapsed[0]?.bilingualAvailabilityLabel, null);
  });
});
