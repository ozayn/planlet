import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isReadingDensityValue,
  readingDensityFromPrisma,
  readingDensityToPrisma,
  READING_DENSITY_OPTIONS,
} from "@/lib/reading-density";

describe("readingDensityFromPrisma", () => {
  it("maps prisma values to css attribute values", () => {
    assert.equal(readingDensityFromPrisma("COMPACT"), "compact");
    assert.equal(readingDensityFromPrisma("COMFORTABLE"), "comfortable");
    assert.equal(readingDensityFromPrisma(null), "compact");
    assert.equal(readingDensityFromPrisma(undefined), "compact");
  });
});

describe("readingDensityToPrisma", () => {
  it("maps css attribute values to prisma values", () => {
    assert.equal(readingDensityToPrisma("compact"), "COMPACT");
    assert.equal(readingDensityToPrisma("comfortable"), "COMFORTABLE");
  });
});

describe("isReadingDensityValue", () => {
  it("accepts known density values", () => {
    assert.equal(isReadingDensityValue("compact"), true);
    assert.equal(isReadingDensityValue("comfortable"), true);
  });

  it("rejects unknown values", () => {
    assert.equal(isReadingDensityValue("large"), false);
    assert.equal(isReadingDensityValue(""), false);
  });
});

describe("READING_DENSITY_OPTIONS", () => {
  it("includes compact and comfortable labels", () => {
    assert.deepEqual(
      READING_DENSITY_OPTIONS.map((option) => option.value),
      ["compact", "comfortable"],
    );
    assert.match(READING_DENSITY_OPTIONS[0]?.description ?? "", /More information/);
    assert.match(
      READING_DENSITY_OPTIONS[1]?.description ?? "",
      /breathing room/,
    );
  });
});
