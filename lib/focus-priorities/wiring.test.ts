import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("Focus Priorities feature wiring", () => {
  const root = join(import.meta.dirname, "../..");

  it("stores description, subtopics, and auto-add daily preference", () => {
    const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
    const migration = readFileSync(
      join(
        root,
        "prisma/migrations/20261019240000_focus_priority_description_subtopics/migration.sql",
      ),
      "utf8",
    );
    const autoAddMigration = readFileSync(
      join(
        root,
        "prisma/migrations/20261019250000_focus_priority_auto_add_daily/migration.sql",
      ),
      "utf8",
    );

    assert.match(schema, /model FocusPriority/);
    assert.match(schema, /description\s+String\?\s+@db\.Text/);
    assert.match(schema, /subtopics\s+String\[\]/);
    assert.match(schema, /autoAddToDailyPlan\s+Boolean\s+@default\(false\)/);
    assert.match(schema, /programWindowMonths\s+Int\?/);
    assert.match(schema, /programStartsOn\s+String\?/);
    assert.match(schema, /programEndsOn\s+String\?/);
    assert.match(schema, /model FocusPriorityDailyPlacement/);
    assert.match(schema, /@@unique\(\[userId, focusPriorityId, dayDate\]\)/);
    assert.match(migration, /ADD COLUMN "description"/);
    assert.match(migration, /ADD COLUMN "subtopics"/);
    assert.match(autoAddMigration, /autoAddToDailyPlan/);
    assert.match(autoAddMigration, /FocusPriorityDailyPlacement/);

    const programMigration = readFileSync(
      join(
        root,
        "prisma/migrations/20261021120000_focus_priority_program_window/migration.sql",
      ),
      "utf8",
    );
    assert.match(programMigration, /programWindowMonths/);
    assert.match(programMigration, /programStartsOn/);
    assert.match(programMigration, /programEndsOn/);
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
    assert.match(lib, /addSingleFocusPriorityToToday/);
    assert.match(lib, /confirmFocusPriorityTaskDraft/);
    assert.match(lib, /resolveUserTodayDateString/);
    assert.match(lib, /getUserTimezone/);
    assert.match(lib, /getOrCreateDayPlan/);
    assert.match(lib, /parseDateString\(dayDate\)/);
    assert.match(lib, /linkFocusPriorityDailyPlacement/);
    assert.doesNotMatch(
      lib.slice(
        lib.indexOf("export async function addSingleFocusPriorityToToday"),
        lib.indexOf("export async function confirmFocusPriorityTaskDraft"),
      ),
      /ensureAutomaticDailyPriorityTasks|ensureAutoFocusPriorityTasksForToday/,
    );
    assert.match(actions, /addSingleFocusPriorityToToday/);
    assert.doesNotMatch(actions, /cookies\(|SKIP_FOCUS_AUTO_ADD/);
    assert.doesNotMatch(actions, /await ensureAutomaticDailyPriorityTasks/);
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
    assert.match(settings, /Add to daily plan automatically/);
    assert.match(settings, /autoAddToDailyPlan/);
    assert.match(settings, /Program window/);
    assert.match(settings, /programStartsOn/);
    assert.match(settings, /programEndsOn/);
  });

  it("wires idempotent auto-add onto today using the user timezone", () => {
    const lib = readFileSync(join(root, "lib/focus-priorities/index.ts"), "utf8");
    const autoAdd = readFileSync(
      join(root, "lib/focus-priorities/auto-add.ts"),
      "utf8",
    );
    const todayPage = readFileSync(
      join(root, "app/(app)/today/page.tsx"),
      "utf8",
    );
    const dayPage = readFileSync(
      join(root, "app/(app)/plans/day/[date]/page.tsx"),
      "utf8",
    );
    const weekPage = readFileSync(
      join(root, "app/(app)/plans/week/[date]/page.tsx"),
      "utf8",
    );
    const plansActions = readFileSync(
      join(root, "app/(app)/plans/actions.ts"),
      "utf8",
    );
    const prismaClient = readFileSync(join(root, "lib/prisma.ts"), "utf8");
    const constants = readFileSync(
      join(root, "lib/focus-priorities/constants.ts"),
      "utf8",
    );

    assert.match(autoAdd, /ensureAutomaticDailyPriorityTasks/);
    assert.match(autoAdd, /ensureAutoFocusPriorityTasksForToday/);
    assert.match(autoAdd, /FocusPriorityDailyPlacement|focusPriorityDailyPlacement/);
    assert.match(autoAdd, /getUserTimezone/);
    assert.match(autoAdd, /getTodayDateString/);
    assert.match(autoAdd, /getOrCreateDayPlan/);
    assert.match(autoAdd, /decideAutoAddPlacement/);
    assert.match(lib, /ensureAutomaticDailyPriorityTasks/);
    assert.match(lib, /loadFocusPrioritiesForAdminUser/);
    // Listing priorities must not batch-create daily tasks.
    const loadFn = lib.slice(
      lib.indexOf("export async function loadFocusPrioritiesForAdminUser"),
      lib.indexOf("function seedCreateData"),
    );
    assert.doesNotMatch(loadFn, /ensureAutomaticDailyPriorityTasks/);
    assert.doesNotMatch(loadFn, /ensureAutoFocusPriorityTasksForToday/);
    // Page render must not create tasks or mutate cookies.
    assert.doesNotMatch(todayPage, /ensureAutomaticDailyPriorityTasks/);
    assert.doesNotMatch(todayPage, /cookies\(/);
    assert.doesNotMatch(dayPage, /ensureAutomaticDailyPriorityTasks/);
    assert.doesNotMatch(dayPage, /cookies\(/);
    assert.doesNotMatch(weekPage, /ensureAutomaticDailyPriorityTasks/);
    // Auto-add only from plan-creation Server Actions.
    assert.match(plansActions, /createTodayPlanAction/);
    assert.match(plansActions, /ensureAutomaticDailyPriorityTasks/);
    assert.match(
      plansActions.slice(
        plansActions.indexOf("export async function createTodayPlanAction"),
        plansActions.indexOf("export async function createDayPlanForDateAction"),
      ),
      /ensureAutomaticDailyPriorityTasks/,
    );
    assert.match(prismaClient, /new Pool/);
    assert.match(prismaClient, /PrismaPg\(pool\)/);
    const focusLoad = todayPage.indexOf("loadFocusPrioritiesForAdminUser");
    const planLoad = todayPage.indexOf("getTodayPlan");
    assert.ok(focusLoad >= 0 && planLoad >= 0 && focusLoad < planLoad);
    assert.match(constants, /Shoulder physical therapy/);
    assert.match(constants, /Foot physical therapy/);
    assert.match(constants, /BetterMe Calisthenics/);
    assert.match(constants, /autoAddToDailyPlan: true/);
    assert.match(constants, /programWindowMonths: 3/);
    assert.match(autoAdd, /evaluateProgramWindow|programWindowMonths/);
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
