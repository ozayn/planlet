import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("Life Areas feature wiring", () => {
  const root = join(import.meta.dirname, "../..");

  it("adds LifeArea models and planOrganizeView without duplicating PlanItem", () => {
    const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
    const migration = readFileSync(
      join(root, "prisma/migrations/20261019210000_add_life_areas/migration.sql"),
      "utf8",
    );

    assert.match(schema, /enum PlanOrganizeView/);
    assert.match(schema, /planOrganizeView\s+PlanOrganizeView\s+@default\(LIST\)/);
    assert.match(schema, /model LifeArea/);
    assert.match(schema, /model PlanItemLifeArea/);
    assert.match(schema, /@@unique\(\[planItemId, lifeAreaId\]\)/);
    assert.match(migration, /PlanItemLifeArea_one_primary_per_item/);
    assert.match(migration, /DEFAULT 'LIST'/);
    assert.doesNotMatch(migration, /CREATE TABLE "PlanItem"/);
  });

  it("keeps List as the default organize view preference", () => {
    const prefs = readFileSync(join(root, "lib/user-preferences.ts"), "utf8");
    const toggle = readFileSync(
      join(root, "components/plans/plan-organize-view-toggle.tsx"),
      "utf8",
    );

    assert.match(prefs, /planOrganizeView === "LIFE_AREAS" \? "LIFE_AREAS" : "LIST"/);
    assert.match(toggle, /\{ value: "LIST", label: "List" \}/);
    assert.match(toggle, /\{ value: "LIFE_AREAS", label: "Life Areas" \}/);
  });

  it("reuses SortablePlanItemList in Life Areas view and List view", () => {
    const sections = readFileSync(
      join(root, "components/plans/plan-item-sections.tsx"),
      "utf8",
    );
    const lifeSections = readFileSync(
      join(root, "components/plans/plan-life-area-sections.tsx"),
      "utf8",
    );
    const card = readFileSync(
      join(root, "components/plans/plan-item-card.tsx"),
      "utf8",
    );
    const assign = readFileSync(
      join(root, "components/plans/item-life-area-assign-control.tsx"),
      "utf8",
    );

    assert.match(sections, /organizeView === "LIFE_AREAS"/);
    assert.match(sections, /SortablePlanItemList/);
    assert.match(sections, /PlanLifeAreaSections/);
    assert.doesNotMatch(sections, /showLifeAreaAssign/);
    assert.match(lifeSections, /SortablePlanItemList/);
    assert.match(lifeSections, /groupPlanItemsByPrimaryLifeArea/);
    assert.match(lifeSections, /UNCATEGORIZED_LIFE_AREA_ID/);
    assert.match(lifeSections, /LifeAreaColorDot/);
    assert.match(lifeSections, /showLifeAreaAssign=/);
    assert.match(lifeSections, /showLifeAreaChange=/);
    assert.match(lifeSections, /includeEmptyAreas: true/);
    assert.match(lifeSections, /\+ Add/);
    assert.match(lifeSections, /primaryLifeAreaId/);
    assert.match(lifeSections, /createPlanItemAction/);
    assert.match(lifeSections, /overflow-x-hidden/);
    assert.match(lifeSections, /min-h-11/);
    assert.doesNotMatch(lifeSections, /PlanLifeAreaDailyOverview/);
    assert.doesNotMatch(lifeSections, /areas represented/);
    assert.doesNotMatch(lifeSections, /backgroundColor:\s*group/);
    assert.match(card, /ItemLifeAreaAssignControl/);
    assert.match(card, /showLifeAreaAssign && canEdit && !isNested/);
    assert.match(card, /showLifeAreaChange && canEdit && !isNested/);
    assert.match(card, /onChangeLifeArea/);
    assert.match(card, /setChangeAreaOpen\(true\)/);
    assert.match(assign, /\+ Area/);
    assert.match(assign, /\+ Create new area/);
    assert.match(assign, /Remove from Life Area/);
    assert.match(assign, /createPortal/);
    assert.match(assign, /setPlanItemPrimaryLifeAreaAction/);
    assert.match(assign, /createLifeAreaAction/);
    assert.match(assign, /router\.refresh\(\)/);
    assert.match(assign, /mode === "change"/);

    const menu = readFileSync(
      join(root, "components/plans/item-actions-menu.tsx"),
      "utf8",
    );
    assert.match(menu, /onChangeLifeArea/);
    assert.match(menu, /Change area/);
  });

  it("preserves secondaries when changing primary via dedicated action", () => {
    const lib = readFileSync(join(root, "lib/life-areas/index.ts"), "utf8");
    const actions = readFileSync(
      join(root, "app/(app)/life-areas/actions.ts"),
      "utf8",
    );
    assert.match(lib, /export async function setPlanItemPrimaryLifeArea/);
    assert.match(lib, /nextSelectionAfterPrimaryChange/);
    assert.match(lib, /planItemLifeArea\.findMany/);
    assert.match(actions, /setPlanItemPrimaryLifeAreaAction/);
    assert.match(actions, /setPlanItemPrimaryLifeArea\(/);
  });

  it("wires day/week/month/year/today plans with lifeAreas props", () => {
    const pages = [
      "app/(app)/today/page.tsx",
      "app/(app)/plans/day/[date]/page.tsx",
      "app/(app)/plans/week/[date]/page.tsx",
      "app/(app)/plans/month/[date]/page.tsx",
      "app/(app)/plans/year/[date]/page.tsx",
      "app/(app)/plans/[id]/page.tsx",
    ];

    for (const relative of pages) {
      const source = readFileSync(join(root, relative), "utf8");
      assert.match(
        source,
        /ensureDefaultLifeAreas/,
        `expected ensureDefaultLifeAreas in ${relative}`,
      );
      assert.match(
        source,
        /planOrganizeView=\{planningPreferences\.planOrganizeView\}/,
        `expected planOrganizeView prop in ${relative}`,
      );
      assert.match(
        source,
        /lifeAreas=\{lifeAreas\}/,
        `expected lifeAreas prop in ${relative}`,
      );
    }
  });

  it("mounts List | Life Areas on the actual period plan toolbars", () => {
    const surfaces = [
      "components/plans/day-plan-content.tsx",
      "components/plans/week-plan-content.tsx",
      "components/plans/month-plan-content.tsx",
      "components/plans/year-plan-content.tsx",
    ];

    for (const relative of surfaces) {
      const source = readFileSync(join(root, relative), "utf8");
      assert.match(
        source,
        /PlanOrganizeViewToggle/,
        `expected PlanOrganizeViewToggle in ${relative}`,
      );
      assert.match(
        source,
        /showOrganizeToggle=\{false\}/,
        `expected toolbar-owned toggle in ${relative}`,
      );
    }

    const editor = readFileSync(
      join(root, "components/plans/plan-editor.tsx"),
      "utf8",
    );
    assert.match(editor, /data-plan-view=\{planViewAttr\}/);
    assert.match(editor, /PlanOrganizeViewToggle/);
    assert.match(editor, /showOrganizeToggle = true/);

    const toggle = readFileSync(
      join(root, "components/plans/plan-organize-view-toggle.tsx"),
      "utf8",
    );
    assert.match(toggle, /data-plan-organize-toggle/);
    assert.match(toggle, /updatePlanOrganizeViewAction/);
  });

  it("exposes optional Life Area picker in task details, not quick-add", () => {
    const details = readFileSync(
      join(root, "components/plans/item-details-sheet.tsx"),
      "utf8",
    );
    const picker = readFileSync(
      join(root, "components/plans/item-life-area-picker.tsx"),
      "utf8",
    );
    const editor = readFileSync(
      join(root, "components/plans/plan-editor.tsx"),
      "utf8",
    );

    assert.match(details, /ItemLifeAreaPicker/);
    assert.doesNotMatch(details, /lifeAreas\.length > 0 && !isNote/);
    assert.match(details, /Theme \/ project/);
    assert.match(picker, /Life Area/);
    assert.match(picker, /Select an area/);
    assert.match(picker, /min-h-12/);
    assert.doesNotMatch(picker, /aria-expanded/);
    assert.match(picker, /\+ Create new Life Area/);
    assert.match(picker, /createLifeAreaAction/);
    assert.match(picker, /setPlanItemLifeAreasAction/);
    assert.match(picker, /\+ Add another area/);
    assert.doesNotMatch(editor, /ItemLifeAreaPicker/);
  });

  it("registers Settings → Planner → Life Areas as a Manage link", () => {
    const registry = readFileSync(join(root, "lib/settings/registry.ts"), "utf8");
    const settings = readFileSync(
      join(root, "components/settings/settings-category-content.tsx"),
      "utf8",
    );
    const page = readFileSync(join(root, "app/(app)/life-areas/page.tsx"), "utf8");
    const manage = readFileSync(
      join(root, "components/settings/life-area-settings.tsx"),
      "utf8",
    );

    assert.match(registry, /id: "life-areas"/);
    assert.match(registry, /title: "Life Areas"/);
    assert.match(registry, /categorySlug: "planner"/);
    assert.match(settings, /id="life-areas"/);
    assert.match(settings, /href="\/life-areas"/);
    assert.match(settings, /Manage →/);
    assert.doesNotMatch(settings, /LifeAreaSettings/);
    assert.match(page, /LifeAreaSettings/);
    assert.match(page, /backHref="\/settings\/planner"/);
    assert.match(page, /backLabel="Planner"/);
    assert.match(manage, /createLifeAreaAction/);
    assert.match(manage, /archiveLifeAreaAction/);
    assert.match(manage, /restoreLifeAreaAction/);
    assert.match(manage, /reorderLifeAreasAction/);
    assert.match(manage, /renameLifeAreaAction/);
  });

  it("seeds defaults once and never duplicates associations in setPlanItemLifeAreas", () => {
    const lib = readFileSync(join(root, "lib/life-areas/index.ts"), "utf8");
    assert.match(lib, /existingCount > 0/);
    assert.match(lib, /DEFAULT_LIFE_AREA_NAMES/);
    assert.match(lib, /applyDefaultLifeAreaRenames/);
    assert.match(lib, /normalizeLifeAreaSelection/);
    assert.match(lib, /planItemLifeArea\.deleteMany/);
    assert.match(lib, /isPrimary: lifeAreaId === normalized\.primaryLifeAreaId/);
  });

  it("shows Life Areas view whenever selected, including empty plans", () => {
    const sections = readFileSync(
      join(root, "components/plans/plan-item-sections.tsx"),
      "utf8",
    );
    const editor = readFileSync(
      join(root, "components/plans/plan-editor.tsx"),
      "utf8",
    );
    const group = readFileSync(join(root, "lib/life-areas/group.ts"), "utf8");

    assert.match(sections, /!showLifeAreas/);
    assert.match(editor, /planOrganizeView === "LIFE_AREAS"/);
    assert.match(group, /includeEmptyAreas/);
    assert.doesNotMatch(sections, /showDailyLifeAreaOverview/);
  });

  it("keeps List view free of Change area / + Area row controls", () => {
    const sections = readFileSync(
      join(root, "components/plans/plan-item-sections.tsx"),
      "utf8",
    );
    assert.doesNotMatch(sections, /showLifeAreaChange/);
    assert.doesNotMatch(sections, /showLifeAreaAssign/);
  });

  it("wires Copy as text By Life Area through the share panel", () => {
    const share = readFileSync(join(root, "lib/share-plan.ts"), "utf8");
    const panel = readFileSync(
      join(root, "components/plans/share-plan-panel.tsx"),
      "utf8",
    );
    const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");

    assert.match(share, /lifeAreas/);
    assert.match(share, /LIFE_AREAS/);
    assert.match(share, /groupShareItemsByPrimaryLifeArea/);
    assert.match(share, /groupByPrimaryLifeArea/);
    assert.match(panel, /By Life Area/);
    assert.match(panel, /flex flex-wrap gap-2/);
    assert.match(panel, /overflow-x-hidden/);
    assert.match(panel, /lifeAreas/);
    assert.match(schema, /LIFE_AREAS/);
  });
});
