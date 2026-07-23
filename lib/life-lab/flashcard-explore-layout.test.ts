import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("flashcard explore focused layout", () => {
  const root = join(import.meta.dirname, "../..");
  const explore = readFileSync(
    join(root, "components/life-lab/flashcard-explore.tsx"),
    "utf8",
  );
  const deckPage = readFileSync(
    join(root, "components/life-lab/life-lab-flashcard-deck-page.tsx"),
    "utf8",
  );
  const readAloud = readFileSync(
    join(root, "components/life-lab/read-aloud-controls.tsx"),
    "utf8",
  );
  const shell = readFileSync(
    join(root, "components/app-layout-shell.tsx"),
    "utf8",
  );
  const drawer = readFileSync(
    join(root, "components/app-nav/app-nav-drawer.tsx"),
    "utf8",
  );
  const sidebar = readFileSync(
    join(root, "components/app-nav/app-nav-sidebar.tsx"),
    "utf8",
  );
  const globals = readFileSync(join(root, "app/globals.css"), "utf8");

  it("hides the generic Flashcards PageHeader on deck detail", () => {
    assert.doesNotMatch(deckPage, /<PageHeader/);
    assert.match(deckPage, /data-flashcard-route="deck-detail"/);
    assert.match(deckPage, /No generic PageHeader/);
  });

  it("renders the deck title once in a compact top bar", () => {
    assert.match(explore, /data-flashcard-title="once"/);
    assert.match(explore, /data-flashcard-header="compact"/);
    assert.match(explore, /header\.shortTitle/);
    assert.match(explore, /header\.displayTitle/);
    assert.doesNotMatch(
      explore,
      /<h2 className="text-lg font-semibold text-foreground"/,
    );
  });

  it("keeps only essential mobile controls outside More", () => {
    assert.match(explore, /data-flashcard-nav="sticky"/);
    assert.match(explore, /Previous/);
    assert.match(explore, /Reveal/);
    assert.match(explore, /Next/);
    assert.match(explore, /aria-label="More actions"/);
    assert.match(explore, /Show all cards/);
    assert.match(explore, /Shuffle/);
    assert.match(explore, /Export/);
    assert.match(explore, /Open source note/);
    assert.match(explore, /safe-area-inset-bottom/);
    assert.match(explore, /data-flashcard-back="true"/);
    assert.equal((explore.match(/data-flashcard-back="true"/g) ?? []).length, 1);
  });

  it("uses compact Listen and hides speech diagnostics by default", () => {
    assert.match(explore, /compact/);
    assert.match(readAloud, /Listen/);
    assert.match(readAloud, /developerMode/);
    assert.match(readAloud, /SpeechDevDiagnostic/);
    assert.match(
      readAloud,
      /developerMode \? \(\s*<SpeechDevDiagnostic/,
    );
  });

  it("uses a responsive card min-height and card-first layout marker", () => {
    assert.match(explore, /data-flashcard-layout="card-first"/);
    assert.match(explore, /min-h-\[clamp\(/);
    assert.match(explore, /dvh/);
    assert.doesNotMatch(explore, /min-h-\[14rem\]/);
    assert.doesNotMatch(explore, /min-h-\[18rem\]/);
  });

  it("keeps Show all as a separate mode with return to Explore", () => {
    assert.match(explore, /data-flashcard-mode="all"/);
    assert.match(explore, /Back to Explore/);
  });

  it("moves the source line into More and closes the drawer once on mount", () => {
    assert.match(explore, /data-flashcard-source-line="more"/);
    assert.doesNotMatch(explore, /data-flashcard-source-line="true"/);
    assert.match(explore, /useCloseNavDrawerOnceOnMount/);
    assert.match(explore, /closeDrawer\(\)/);
    assert.match(explore, /closedOnceRef/);
  });

  it("uses a focused flashcard shell with full-width mobile gutters", () => {
    assert.match(shell, /data-flashcard-shell=\{isFlashcardDeck \? "focus"/);
    assert.match(shell, /ui-app-main-flashcard/);
    assert.match(shell, /hideMobileAppBar/);
    assert.match(shell, /px-3/);
    assert.match(shell, /FLASHCARD_DECK_DETAIL/);
  });

  it("keeps the nav drawer overlay-only below desktop and docked sidebar at lg", () => {
    assert.match(drawer, /data-nav-drawer="overlay"/);
    assert.match(drawer, /lg:hidden/);
    assert.match(drawer, /useState\(false\)/);
    assert.match(drawer, /registerMenuButton/);
    assert.match(drawer, /menuButtonRef\.current\?\.focus/);
    assert.match(sidebar, /lg:flex lg:flex-col/);
    assert.match(sidebar, /data-nav-sidebar="docked"/);
  });

  it("hides the docked sidebar for coarse landscape and flashcard focus shells", () => {
    assert.match(globals, /max-height: 600px\) and \(pointer: coarse\)/);
    assert.match(globals, /\[data-flashcard-shell="focus"\] \.ui-app-nav-sidebar/);
    assert.match(globals, /\.ui-app-main-flashcard/);
    assert.match(globals, /flashcard-face-toggle/);
  });
});
