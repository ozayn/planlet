import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  containsPersianArabicScript,
  normalizeSearchText,
  resolveTextDirection,
} from "@/lib/text-direction";

describe("text direction", () => {
  it("detects Persian and English paragraphs", () => {
    assert.equal(resolveTextDirection("خلاصه جلسه امروز"), "rtl");
    assert.equal(resolveTextDirection("A short English summary"), "ltr");
    assert.equal(containsPersianArabicScript("خلاصهای کوتاه"), true);
  });

  it("keeps balanced mixed text on auto", () => {
    assert.equal(resolveTextDirection("خلاصه summary notes یادداشت"), "auto");
  });

  it("normalizes Persian search variants", () => {
    assert.equal(normalizeSearchText("كتاب‌ها"), normalizeSearchText("کتابها"));
    assert.equal(normalizeSearchText("يك"), normalizeSearchText("یک"));
  });
});
