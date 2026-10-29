import assert from "node:assert/strict";
import { test } from "node:test";
import { driveRelativePathToSlug, findLifeLabRecordBySlug } from "./slug";

test("same-date Persian video filenames have distinct, language-specific routes", () => {
  const paths = [
    "videos/2026-10-22-محمود-حقیقی.md",
    "videos/2026-10-22-ترکیه-اردوغان.md",
    "videos/2026-08-24-ملت-بودن.en.md",
    "videos/2026-08-24-ملت-بودن.fa.md",
  ];
  const records = paths.map(relativePath => ({ relativePath, slug: driveRelativePathToSlug(relativePath) }));
  assert.equal(new Set(records.map(r => r.slug)).size, 4);
  for (const record of records) assert.equal(findLifeLabRecordBySlug(records, record.slug), record);
  assert.equal(findLifeLabRecordBySlug(records, "videos__2026-10-22"), undefined);
  assert.equal(findLifeLabRecordBySlug(records, "videos__2026-08-24-en"), records[2]);
  assert.equal(driveRelativePathToSlug("videos/2026-10-22-bplus.md"), "videos__2026-10-22-bplus");
});
