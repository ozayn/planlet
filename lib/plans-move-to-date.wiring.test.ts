import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("movePlanItemToDate association wiring", () => {
  const root = join(import.meta.dirname, "..");
  const plans = readFileSync(join(root, "lib/plans.ts"), "utf8");
  const unfinished = readFileSync(
    join(root, "app/(app)/unfinished/actions.ts"),
    "utf8",
  );
  const planActions = readFileSync(
    join(root, "app/(app)/plans/actions.ts"),
    "utf8",
  );

  it("loads and copies Life Area links when moving across dates", () => {
    const moveStart = plans.indexOf("export async function movePlanItemToDate");
    const moveEnd = plans.indexOf(
      "export async function movePlanItem(",
      moveStart,
    );
    const moveFn = plans.slice(moveStart, moveEnd);

    assert.match(moveFn, /lifeAreaLinks:\s*\{/);
    assert.match(moveFn, /toCopyablePlanItemFields/);
    assert.match(moveFn, /prisma\.\$transaction/);
    assert.match(moveFn, /copyRootItemToPlan/);
    assert.match(plans, /associationsFromLifeAreaLinks/);
    assert.match(plans, /secondaryLifeAreaIds/);
    assert.match(plans, /primaryLifeAreaId: item\.primaryLifeAreaId/);
    assert.match(plans, /themeId: item\.themeId/);
    assert.match(plans, /projectId: item\.projectId/);
  });

  it("creates primary and secondary Life Area links atomically on create", () => {
    assert.match(plans, /secondaryLifeAreaIds\?:/);
    assert.match(plans, /normalizeLifeAreaSelection/);
    assert.match(plans, /lifeAreaLinks:\s*\{\s*create: lifeAreaLinks/);
  });

  it("routes unfinished Move through the same movePlanItemToDate path", () => {
    assert.match(unfinished, /movePlanItemToDate/);
    assert.match(planActions, /movePlanItemToDateAction/);
    assert.match(planActions, /revalidatePlanPaths\(result\.sourcePlanId/);
    assert.match(planActions, /revalidatePlanPaths\(result\.targetPlanId/);
  });
});
