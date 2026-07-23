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

  it("uses a restrained card min-height and card-first layout marker", () => {
    assert.match(explore, /data-flashcard-layout="card-first"/);
    assert.match(explore, /min-h-\[7rem\]/);
    assert.doesNotMatch(explore, /min-h-\[14rem\]/);
    assert.doesNotMatch(explore, /min-h-\[18rem\]/);
  });

  it("keeps Show all as a separate mode with return to Explore", () => {
    assert.match(explore, /data-flashcard-mode="all"/);
    assert.match(explore, /Back to Explore/);
  });
});
