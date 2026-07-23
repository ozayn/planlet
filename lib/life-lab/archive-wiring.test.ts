import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("life lab archive wiring", () => {
  const root = join(import.meta.dirname, "../..");

  it("adds LifeLabItemState schema and migration without Drive writes", () => {
    const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
    const migration = readFileSync(
      join(
        root,
        "prisma/migrations/20260723230000_add_life_lab_item_state/migration.sql",
      ),
      "utf8",
    );
    const actions = readFileSync(
      join(root, "app/(app)/life-lab/archive-actions.ts"),
      "utf8",
    );

    assert.match(schema, /model LifeLabItemState/);
    assert.match(schema, /@@unique\(\[userId, itemKey\]\)/);
    assert.match(migration, /CREATE TABLE "LifeLabItemState"/);
    assert.match(actions, /archiveLifeLabItemAction/);
    assert.match(actions, /unarchiveLifeLabItemAction/);
    assert.doesNotMatch(actions, /drive\.files\.update|move|rename/i);
  });

  it("wires Archive into flashcard More menus and list filters", () => {
    const decks = readFileSync(
      join(root, "components/life-lab/flashcards-page-content.tsx"),
      "utf8",
    );
    const explore = readFileSync(
      join(root, "components/life-lab/flashcard-explore.tsx"),
      "utf8",
    );

    assert.match(decks, /LifeLabArchiveMenuItem/);
    assert.match(decks, /Include archived/);
    assert.match(decks, /data-flashcard-deck-card/);
    assert.match(explore, /ArchiveFlashcardDeck|archiveFlashcardDeck/);
    assert.match(explore, /initiallyArchived/);
    assert.match(explore, /setDeckArchived/);
  });

  it("adds Archived page and toast undo wiring", () => {
    const page = readFileSync(
      join(root, "app/(app)/life-lab/archived/page.tsx"),
      "utf8",
    );
    const toast = readFileSync(
      join(root, "components/life-lab/life-lab-toast.tsx"),
      "utf8",
    );
    const menuItem = readFileSync(
      join(root, "components/life-lab/life-lab-archive-menu-item.tsx"),
      "utf8",
    );
    const home = readFileSync(
      join(root, "app/(app)/life-lab/page.tsx"),
      "utf8",
    );

    assert.match(page, /LifeLabArchivedPageContent/);
    assert.match(toast, /aria-live="polite"/);
    assert.match(menuItem, /Undo/);
    assert.match(menuItem, /onArchivedChange\?\.\(archived\)/);
    assert.match(home, /\/life-lab\/archived/);
  });

  it("keeps Archive inside More on note cards and detail headers", () => {
    const notes = readFileSync(
      join(root, "components/life-lab/life-lab-section-notes.tsx"),
      "utf8",
    );
    const header = readFileSync(
      join(root, "components/life-lab/life-lab-note-detail-header.tsx"),
      "utf8",
    );
    const labels = readFileSync(join(root, "lib/action-labels.ts"), "utf8");

    assert.match(notes, /LifeLabItemMoreMenu/);
    assert.match(notes, /LifeLabArchiveMenuItem/);
    assert.match(header, /LifeLabArchiveMenuItem/);
    assert.match(labels, /archiveLifeLabNote/);
    assert.match(labels, /unarchiveFlashcardDeck/);
  });
});
