import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { LIFE_LAB_MAX_FILES_PER_SECTION } from "@/lib/life-lab/constants";
import { buildNoteItemKey } from "@/lib/life-lab/item-key";
import { isPodcastVisibleMarkdown } from "@/lib/life-lab/podcasts";
import { isFlashcardVisibleRelativePath } from "@/lib/life-lab/flashcard-decks";
import { isFilmLabExcludedRelativePath } from "@/lib/life-lab/film-lab";
import {
  countBrowseNotesBySection,
  countVisibleSectionNotes,
  homeSectionCardMeta,
  isLifeLabWorkingFolderName,
  isLifeLabWorkingRelativePath,
  LIFE_LAB_LEGACY_SECTION_FILE_CAP,
  sectionListingLimitAllowsGrowthBeyondLegacyCap,
} from "@/lib/life-lab/section-counts";

const root = join(process.cwd());

function note(relativePath: string, slug = relativePath.replace(/\.md$/i, "")) {
  return { relativePath, slug };
}

describe("life lab home section counts", () => {
  it("allows listings to grow beyond the legacy 300-file cap", () => {
    assert.equal(LIFE_LAB_LEGACY_SECTION_FILE_CAP, 300);
    assert.ok(LIFE_LAB_MAX_FILES_PER_SECTION > LIFE_LAB_LEGACY_SECTION_FILE_CAP);
    assert.equal(sectionListingLimitAllowsGrowthBeyondLegacyCap(), true);
    assert.equal(sectionListingLimitAllowsGrowthBeyondLegacyCap(300), false);
  });

  it("derives cheap browse counts without extra I/O helpers", () => {
    const browseNotes = [
      { sectionId: "youtube-learning" as const },
      { sectionId: "youtube-learning" as const },
      { sectionId: "reading-briefs" as const },
    ];
    const counts = countBrowseNotesBySection(browseNotes);
    assert.equal(counts.get("youtube-learning"), 2);
    assert.equal(counts.get("reading-briefs"), 1);

    assert.equal(
      homeSectionCardMeta({
        sectionId: "youtube-learning",
        browseCounts: counts,
      }),
      "2 notes",
    );
    assert.equal(
      homeSectionCardMeta({
        sectionId: "reading-briefs",
        browseCounts: counts,
      }),
      "1 note",
    );
  });

  it("omits Flashcards deck/card meta on home (parsing is expensive)", () => {
    const counts = countBrowseNotesBySection([
      { sectionId: "flashcards" },
      { sectionId: "flashcards" },
    ]);

    assert.equal(
      homeSectionCardMeta({
        sectionId: "flashcards",
        browseCounts: counts,
      }),
      undefined,
    );
  });

  it("omits all section meta when browse counts are unavailable", () => {
    assert.equal(
      homeSectionCardMeta({
        sectionId: "youtube-learning",
        browseCounts: null,
      }),
      undefined,
    );
  });

  it("increases YouTube count when another note is added to browse payload", () => {
    const base = [
      note("videos/a.md", "videos__a"),
      note("videos/b.md", "videos__b"),
    ];
    assert.equal(countVisibleSectionNotes("youtube-learning", base), 2);

    const withNew = [...base, note("videos/c.md", "videos__c")];
    assert.equal(countVisibleSectionNotes("youtube-learning", withNew), 3);
  });

  it("increases Reading Briefs count when another brief is added", () => {
    const base = [note("briefs/one.md", "briefs__one")];
    assert.equal(countVisibleSectionNotes("reading-briefs", base), 1);

    const withNew = [...base, note("briefs/two.md", "briefs__two")];
    assert.equal(countVisibleSectionNotes("reading-briefs", withNew), 2);
  });

  it("does not count _working or excluded content toward visible totals", () => {
    assert.equal(isLifeLabWorkingFolderName("_working"), true);
    assert.equal(isLifeLabWorkingFolderName("notes"), false);
    assert.equal(
      isLifeLabWorkingRelativePath("_working/internal-episode.md"),
      true,
    );
    assert.equal(isLifeLabWorkingRelativePath("playlists/video.md"), false);

    const listed = [
      note("playlists/video.md", "playlists__video"),
      note("_working/draft.md", "_working__draft"),
    ].filter((entry) => !isLifeLabWorkingRelativePath(entry.relativePath));

    assert.equal(countVisibleSectionNotes("youtube-learning", listed), 1);

    assert.equal(isPodcastVisibleMarkdown("show/working/notes.md"), false);
    assert.equal(isFlashcardVisibleRelativePath("working/deck.txt"), false);
    assert.equal(isFilmLabExcludedRelativePath("raw/export.md"), true);
  });

  it("counts can exceed 300 and are not clamped to the legacy cap", () => {
    const records = Array.from({ length: 301 }, (_, index) =>
      note(`videos/note-${index}.md`, `videos__note-${index}`),
    );

    const count = countVisibleSectionNotes("youtube-learning", records);
    assert.equal(count, 301);
    assert.ok(count > LIFE_LAB_LEGACY_SECTION_FILE_CAP);
  });

  it("excludes archived notes from optional overlays", () => {
    const records = [
      note("videos/a.md", "videos__a"),
      note("videos/b.md", "videos__b"),
    ];
    const archivedKeys = new Set([
      buildNoteItemKey({
        sectionId: "youtube-learning",
        relativePath: "videos/a.md",
        slug: "videos__a",
      }),
    ]);

    assert.equal(
      countVisibleSectionNotes("youtube-learning", records, archivedKeys),
      1,
    );
  });

  it("keeps home landing free of flashcard parsing and dedicated section-index count scans", () => {
    const page = readFileSync(
      join(root, "app/(app)/life-lab/page.tsx"),
      "utf8",
    );
    const lifeLab = readFileSync(join(root, "lib/life-lab.ts"), "utf8");

    assert.match(page, /getLifeLabHomeData/);
    assert.match(page, /getLifeLabBrowseData/);
    assert.match(page, /countBrowseNotesBySection/);
    assert.match(page, /homeSectionCardMeta/);
    assert.doesNotMatch(page, /getLifeLabFlashcardSummary/);
    assert.doesNotMatch(page, /formatFlashcardSectionMeta/);
    assert.doesNotMatch(page, /Study all/);

    assert.match(
      lifeLab,
      /never scan every section index just for meta/,
    );
    assert.doesNotMatch(
      lifeLab.slice(
        lifeLab.indexOf("export async function getLifeLabHomeData"),
        lifeLab.indexOf("export async function getLifeLabSectionData"),
      ),
      /getSectionNotesCached/,
    );
  });
});
