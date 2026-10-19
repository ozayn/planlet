import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CUSTOM_LIFE_AREA_COLOR_PALETTE,
  LIFE_AREA_COLOR_BY_NAME,
  UNCATEGORIZED_LIFE_AREA_COLOR,
  colorForCustomLifeArea,
  resolveLifeAreaColor,
} from "@/lib/life-areas/colors";
import { DEFAULT_LIFE_AREA_NAMES } from "@/lib/life-areas/constants";

describe("Life Area colors", () => {
  it("maps default Life Areas to the suggested palette", () => {
    assert.equal(
      resolveLifeAreaColor("Career & Professional Life"),
      "#527DA6",
    );
    assert.equal(resolveLifeAreaColor("Learning & Growth"), "#73957B");
    assert.equal(resolveLifeAreaColor("Projects & Creativity"), "#9276A8");
    assert.equal(resolveLifeAreaColor("Relationships"), "#B77F8B");
    assert.equal(resolveLifeAreaColor("Health & Wellbeing"), "#579A95");
    assert.equal(resolveLifeAreaColor("Leisure & Experiences"), "#C49A58");
    assert.equal(resolveLifeAreaColor("Home & Life Admin"), "#87919C");

    for (const name of DEFAULT_LIFE_AREA_NAMES) {
      assert.equal(resolveLifeAreaColor(name), LIFE_AREA_COLOR_BY_NAME[name]);
    }
  });

  it("keeps legacy default names on the same colors", () => {
    assert.equal(resolveLifeAreaColor("Career & Job Search"), "#527DA6");
    assert.equal(resolveLifeAreaColor("Learning & Development"), "#73957B");
    assert.equal(resolveLifeAreaColor("Coding & Projects"), "#9276A8");
    assert.equal(resolveLifeAreaColor("Arts & Enjoyment"), "#C49A58");
    assert.equal(resolveLifeAreaColor("Home & Personal"), "#87919C");
  });

  it("uses neutral gray for Uncategorized", () => {
    assert.equal(resolveLifeAreaColor("Uncategorized"), UNCATEGORIZED_LIFE_AREA_COLOR);
    assert.equal(
      resolveLifeAreaColor("Career & Professional Life", { uncategorized: true }),
      UNCATEGORIZED_LIFE_AREA_COLOR,
    );
    assert.equal(UNCATEGORIZED_LIFE_AREA_COLOR, "#9C958E");
  });

  it("assigns stable automatic colors to custom Life Areas", () => {
    const first = colorForCustomLifeArea("Deep Work Lab");
    const second = colorForCustomLifeArea("Deep Work Lab");
    const other = colorForCustomLifeArea("Community Garden");

    assert.equal(first, second);
    assert.ok(CUSTOM_LIFE_AREA_COLOR_PALETTE.includes(first as (typeof CUSTOM_LIFE_AREA_COLOR_PALETTE)[number]));
    assert.equal(resolveLifeAreaColor("Deep Work Lab"), first);
    // Different names may share a palette slot; only require stable resolution.
    assert.equal(resolveLifeAreaColor("Community Garden"), other);
  });
});
