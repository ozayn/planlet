import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("Focus Priorities feature wiring", () => {
  const root = join(import.meta.dirname, "../..");

  it("stores description and nested subtopics on FocusPriority", () => {
    const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
    const migration = readFileSync(
      join(
        root,
        "prisma/migrations/20261019240000_focus_priority_description_subtopics/migration.sql",
      ),
      "utf8",
    );

    assert.match(schema, /model FocusPriority/);
    assert.match(schema, /description\s+String\?\s+@db\.Text/);
    assert.match(schema, /subtopics\s+String\[\]/);
    assert.match(migration, /ADD COLUMN "description"/);
    assert.match(migration, /ADD COLUMN "subtopics"/);
  });

  it("exposes admin-only Settings manage link and dedicated page", () => {
    const registry = readFileSync(join(root, "lib/settings/registry.ts"), "utf8");
    const category = readFileSync(
      join(root, "components/settings/settings-category-content.tsx"),
      "utf8",
    );
    const page = readFileSync(
      join(root, "app/(app)/focus-priorities/page.tsx"),
      "utf8",
    );
    const actions = readFileSync(
      join(root, "app/(app)/focus-priorities/actions.ts"),
      "utf8",
    );

    assert.match(registry, /id: "focus-priorities"/);
    assert.match(registry, /access\.isSignedIn && access\.isAdmin/);
    assert.match(category, /Manage Focus Priorities/);
    assert.match(category, /data\.access\.isAdmin/);
    assert.match(page, /isAdminRole/);
    assert.match(page, /notFound\(\)/);
    assert.match(actions, /assertFocusPrioritiesAdminAccess/);
    assert.match(actions, /confirmFocusPriorityTaskDraftAction/);
  });

  it("consolidates legacy defaults idempotently without deleting PlanItems", () => {
    const lib = readFileSync(join(root, "lib/focus-priorities/index.ts"), "utf8");
    const constants = readFileSync(
      join(root, "lib/focus-priorities/constants.ts"),
      "utf8",
    );

    assert.match(constants, /CANONICAL_FOCUS_PRIORITY_SEEDS/);
    assert.match(constants, /LEGACY_FOCUS_PRIORITY_DEFAULTS/);
    assert.match(constants, /planFocusPriorityConsolidation/);
    assert.match(lib, /planFocusPriorityConsolidation/);
    assert.match(lib, /deleteMany/);
    assert.doesNotMatch(lib, /prisma\.planItem\.delete/);
    assert.doesNotMatch(lib, /prisma\.planItem\.update/);
  });

  it("opens an editable draft when a priority row is clicked", () => {
    const suggestions = readFileSync(
      join(root, "components/plans/life-area-focus-priorities.tsx"),
      "utf8",
    );
    const sections = readFileSync(
      join(root, "components/plans/plan-life-area-sections.tsx"),
      "utf8",
    );
    const lib = readFileSync(join(root, "lib/focus-priorities/index.ts"), "utf8");
    const actions = readFileSync(
      join(root, "app/(app)/focus-priorities/actions.ts"),
      "utf8",
    );

    assert.match(suggestions, /Add to today/);
    assert.match(suggestions, /confirmFocusPriorityTaskDraftAction/);
    assert.match(suggestions, /startDraft/);
    assert.match(suggestions, /Add \$\{priority\.title\} to today/);
    assert.match(suggestions, /min-h-11/);
    assert.match(suggestions, /router\.push\("\/today"\)/);
    assert.match(suggestions, /Change Life Area/);
    assert.match(suggestions, /invokeServerAction/);
    assert.doesNotMatch(suggestions, /Save to today/);
    assert.doesNotMatch(suggestions, /LifeAreaColorDot/);
    assert.doesNotMatch(suggestions, /\+ Add/);
    assert.doesNotMatch(suggestions, />\s*Priorities\s*</);
    assert.doesNotMatch(suggestions, /addFocusPriorityToTodayAction/);
    assert.match(sections, /LifeAreaColorDot/);
    assert.match(sections, /\+ Add/);
    assert.match(lib, /confirmFocusPriorityTaskDraft/);
    assert.match(lib, /resolveUserTodayDateString/);
    assert.match(lib, /getUserTimezone/);
    assert.match(lib, /getOrCreateDayPlan/);
    assert.match(lib, /parseDateString\(dayDate\)/);
    assert.match(actions, /revalidatePath\(`\/plans\/day\/\$\{dayDate\}`\)/);
    assert.match(actions, /revalidatePath\("\/today", "layout"\)/);
  });

  it("shows Technical Practice subtopics in the draft, not as separate cards", () => {
    const suggestions = readFileSync(
      join(root, "components/plans/life-area-focus-priorities.tsx"),
      "utf8",
    );
    const constants = readFileSync(
      join(root, "lib/focus-priorities/constants.ts"),
      "utf8",
    );

    assert.match(suggestions, /priority\.subtopics/);
    assert.match(constants, /Technical Practice/);
    assert.match(constants, /Statistics & Experimentation/);

    const canonicalBlock = constants.slice(
      constants.indexOf("export const CANONICAL_FOCUS_PRIORITY_SEEDS"),
      constants.indexOf("export const DEFAULT_FOCUS_PRIORITY_SEEDS"),
    );
    assert.match(canonicalBlock, /subtopics: \[[\s\S]*"SQL"/);
    assert.equal(
      canonicalBlock.includes('title: "SQL"'),
      false,
      "SQL must be a subtopic, not a separate canonical priority card",
    );
  });

  it("does not hardcode priority names in UI components", () => {
    const suggestions = readFileSync(
      join(root, "components/plans/life-area-focus-priorities.tsx"),
      "utf8",
    );
    const settings = readFileSync(
      join(root, "components/settings/focus-priority-settings.tsx"),
      "utf8",
    );

    assert.doesNotMatch(suggestions, /Applications/);
    assert.doesNotMatch(suggestions, /Technical Practice/);
    assert.doesNotMatch(settings, /Applications/);
    assert.doesNotMatch(settings, /Portfolio Polish/);
    assert.match(settings, /description/);
    assert.match(settings, /subtopics/);
  });

  it("passes Focus Priorities only into the Life Areas sections branch", () => {
    const itemSections = readFileSync(
      join(root, "components/plans/plan-item-sections.tsx"),
      "utf8",
    );
    assert.match(
      itemSections,
      /PlanLifeAreaSections[\s\S]*focusPriorities=\{focusPriorities\}/,
    );
    assert.match(itemSections, /organizeView === "LIFE_AREAS"/);
  });
});
