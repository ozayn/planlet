import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { resolveLifeLabNoteBackLink } from "@/lib/life-lab/note-back-link";

describe("Life Lab note detail header chrome", () => {
  const root = join(import.meta.dirname, "../..");

  const header = readFileSync(
    join(root, "components/life-lab/life-lab-note-detail-header.tsx"),
    "utf8",
  );
  const contentHeader = readFileSync(
    join(root, "components/life-lab/life-lab-content-header.tsx"),
    "utf8",
  );
  const moreMenu = readFileSync(
    join(root, "components/life-lab/life-lab-note-more-menu.tsx"),
    "utf8",
  );
  const listenPlayer = readFileSync(
    join(root, "components/read-aloud/read-aloud-listen-player.tsx"),
    "utf8",
  );
  const notePage = readFileSync(
    join(root, "app/(app)/life-lab/[section]/[slug]/page.tsx"),
    "utf8",
  );
  const compactMeta = readFileSync(
    join(root, "components/life-lab/life-lab-compact-source-meta.tsx"),
    "utf8",
  );
  const details = readFileSync(
    join(root, "components/life-lab/life-lab-details-disclosure.tsx"),
    "utf8",
  );
  const image = readFileSync(
    join(root, "components/life-lab/life-lab-note-image.tsx"),
    "utf8",
  );

  it("keeps a single More menu in the note action row", () => {
    assert.match(header, /LifeLabNoteMoreMenu/);
    assert.match(header, /LifeLabPrimaryActions/);
    assert.equal(
      (header.match(/<LifeLabNoteMoreMenu/g) ?? []).length,
      1,
    );
    assert.doesNotMatch(header, /LifeLabItemMoreMenu/);
    assert.doesNotMatch(header, /LifeLabNoteDevToolbar/);
    assert.match(moreMenu, /LifeLabItemMoreMenu/);
    assert.match(moreMenu, /LifeLabArchiveMenuItem/);
    assert.match(moreMenu, /Copy link/);
    assert.match(moreMenu, /Share/);
  });

  it("renders Flashcards as mode navigation, not an action button", () => {
    assert.match(header, /LifeLabModeTabs/);
    assert.match(header, /label: "Flashcards"/);
    assert.match(header, /label: "Overview"/);
    assert.match(header, /isLifeLabNoteCoachingTabEnabled/);
    assert.doesNotMatch(header, /Flashcards ·/);
    assert.doesNotMatch(
      header,
      /href=\{`\$\{noteHref\}\?view=flashcards`\}[\s\S]*rounded-full bg-accent-cream/,
    );
  });

  it("hides the Coaching note tab while keeping it re-enableable", () => {
    const modeTabs = readFileSync(
      join(root, "lib/life-lab/note-mode-tabs.ts"),
      "utf8",
    );
    const page = readFileSync(
      join(root, "app/(app)/life-lab/[section]/[slug]/page.tsx"),
      "utf8",
    );

    assert.match(modeTabs, /LIFE_LAB_NOTE_COACHING_TAB_ENABLED = false/);
    assert.match(header, /coachingTabEnabled/);
    assert.match(header, /label: "Coaching"/);
    assert.doesNotMatch(page, /showCoaching=/);
    assert.doesNotMatch(page, /canUseCoachingFeatures/);
  });

  it("removes Back from the action toolbar", () => {
    assert.match(contentHeader, /data-life-lab-back-link/);
    assert.match(header, /resolveLifeLabNoteBackLink/);
    assert.doesNotMatch(header, />\s*Back\s*</);
  });

  it("does not show Start from in the default Listen idle chrome", () => {
    assert.match(listenPlayer, /data-life-lab-start-section-menu/);
    assert.doesNotMatch(
      listenPlayer,
      /label className="flex items-center gap-1\.5 text-xs text-muted">\s*<span>Start from<\/span>/,
    );
  });

  it("shows compact source metadata and Open original once", () => {
    assert.match(header, /LifeLabCompactSourceMeta/);
    assert.match(compactMeta, /data-life-lab-open-original/);
    assert.match(compactMeta, /Open original/);
    assert.equal(
      (compactMeta.match(/data-life-lab-open-original/g) ?? []).length,
      1,
    );
    assert.doesNotMatch(header, /LifeLabSourceLink/);
    assert.doesNotMatch(header, /YouTube Learning ·/);
  });

  it("hides tag chips in the header and keeps one Details disclosure", () => {
    assert.doesNotMatch(header, /LifeLabMetadataChips/);
    assert.match(header, /export function LifeLabNoteDetailsSection/);
    assert.match(details, /data-life-lab-details-disclosure/);
    assert.equal(
      (details.match(/data-life-lab-details-disclosure/g) ?? []).length,
      1,
    );
  });

  it("places Details after note content on the page", () => {
    assert.match(notePage, /LifeLabNoteDetailsSection/);
    const contentIndex = notePage.indexOf("LifeLabNoteContent");
    const detailsIndex = notePage.indexOf("LifeLabNoteDetailsSection");
    assert.ok(contentIndex >= 0);
    assert.ok(detailsIndex > contentIndex);
  });

  it("keeps Listen as one-click primary action", () => {
    assert.match(header, /LifeLabNoteListen/);
    assert.match(listenPlayer, />\s*Listen\s*</);
    assert.match(listenPlayer, /ListenPrimaryButton onClick=\{handleStart\}/);
  });

  it("uses a 16:9 hero thumbnail with optional original link", () => {
    assert.match(image, /aspect-video/);
    assert.match(image, /data-life-lab-hero-image/);
    assert.match(image, /href\?:/);
    assert.match(notePage, /hero=\{/);
    assert.match(notePage, /href=\{youtubeSourceUrl\}/);
  });

  it("resolves playlist vs standalone back targets", () => {
    const playlistBack = resolveLifeLabNoteBackLink({
      sectionId: "youtube-learning",
      sectionLabel: "YouTube Learning",
      playlistNav: {
        playlistIndexHref: "/life-lab/youtube-learning/playlist-slug",
        playlistTitle: "Great Library Series",
        previous: null,
        next: null,
        currentEpisode: "1",
      },
    });
    assert.equal(
      playlistBack.href,
      "/life-lab/youtube-learning/playlist-slug",
    );
    assert.match(playlistBack.label, /Great Library Series/);

    const standaloneBack = resolveLifeLabNoteBackLink({
      sectionId: "youtube-learning",
      sectionLabel: "YouTube Learning",
      playlistNav: null,
    });
    assert.equal(standaloneBack.href, "/life-lab/youtube-learning");
    assert.match(standaloneBack.label, /YouTube Learning/);
  });

  it("keeps default note chrome free of competing top Reading/Refresh row", () => {
    assert.match(notePage, /!isDefaultNoteDetail/);
    assert.match(moreMenu, /LifeLabReadingControls/);
    assert.match(moreMenu, /LifeLabRefreshButton/);
  });

  it("avoids cramped mode tabs on mobile", () => {
    const modeTabs = readFileSync(
      join(root, "components/life-lab/life-lab-mode-tabs.tsx"),
      "utf8",
    );
    assert.match(modeTabs, /overflow-x-auto/);
    assert.match(modeTabs, /min-h-11/);
  });
});
