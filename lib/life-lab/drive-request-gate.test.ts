import assert from "node:assert/strict";
import { test } from "node:test";
import { DriveRequestGate } from "./drive-request-gate";

test("a large refresh stays within the concurrency limit", async () => {
  const gate = new DriveRequestGate(3);
  let active = 0;
  let peak = 0;
  await Promise.all(Array.from({ length: 366 }, () => gate.run(async () => {
    active++;
    peak = Math.max(peak, active);
    await new Promise<void>((resolve) => setImmediate(resolve));
    active--;
  })));
  assert.equal(peak, 3);
});

test("quota failure stops queued and subsequent requests without sending them", async () => {
  const gate = new DriveRequestGate(1);
  const error = new Error("rateLimitExceeded");
  let calls = 0;
  const results = await Promise.allSettled(Array.from({ length: 100 }, () =>
    gate.run(async () => { calls++; gate.block(error); throw error; })));
  assert.equal(calls, 1);
  assert.ok(results.every((r) => r.status === "rejected" && r.reason === error));
  await assert.rejects(gate.run(async () => { calls++; }), /rateLimitExceeded/);
  assert.equal(calls, 1);
});

test("requests resume when cooldown expires and slots survive failures", async () => {
  const gate = new DriveRequestGate(1);
  gate.block(new Error("quota"), -1);
  await assert.rejects(gate.run(async () => { throw new Error("network"); }));
  assert.equal(await gate.run(async () => "ok"), "ok");
});
