import assert from "node:assert/strict";
import { test } from "node:test";
import { singleFlight } from "./single-flight";

test("overlapping navigation and prefetch share one scan, then allow refresh", async () => {
  let scans = 0;
  const load = async () => { scans++; return ["note"]; };
  const results = await Promise.all(Array.from({ length: 20 }, () => singleFlight("youtube", load)));
  assert.equal(scans, 1);
  assert.ok(results.every((result) => result === results[0]));
  await singleFlight("youtube", load);
  assert.equal(scans, 2);
});

test("failed scans are shared but never retained; sections remain independent", async () => {
  let scans = 0;
  const fail = async () => { scans++; throw new Error("quota"); };
  const results = await Promise.allSettled([singleFlight("failed", fail), singleFlight("failed", fail)]);
  assert.equal(scans, 1);
  assert.ok(results.every((result) => result.status === "rejected"));
  assert.equal(await singleFlight("failed", async () => "recovered"), "recovered");
  assert.deepEqual(await Promise.all([
    singleFlight("a", async () => "a"), singleFlight("b", async () => "b"),
  ]), ["a", "b"]);
});
