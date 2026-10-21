import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  decideAutoAddPlacement,
} from "@/lib/focus-priorities/auto-add";
import {
  evaluateProgramWindow,
  normalizeProgramWindowInput,
  programEndDateFromStart,
} from "@/lib/focus-priorities/program-window";

describe("program window helpers", () => {
  it("derives a three-month inclusive end from start without hardcoding a start", () => {
    assert.equal(programEndDateFromStart("2026-01-15", 3), "2026-04-15");
    assert.equal(programEndDateFromStart("2026-11-30", 3), "2027-02-28");
  });

  it("keeps ongoing priorities active when no program window is set", () => {
    assert.deepEqual(
      evaluateProgramWindow({
        dayDate: "2026-10-21",
        programWindowMonths: null,
        programStartsOn: null,
        programEndsOn: null,
      }),
      { active: true },
    );
  });

  it("skips auto-add until the editable window is configured", () => {
    assert.deepEqual(
      evaluateProgramWindow({
        dayDate: "2026-10-21",
        programWindowMonths: 3,
        programStartsOn: null,
        programEndsOn: null,
      }),
      { active: false, reason: "not_configured" },
    );
  });

  it("stops auto-add after the program end date", () => {
    assert.deepEqual(
      evaluateProgramWindow({
        dayDate: "2026-04-16",
        programWindowMonths: 3,
        programStartsOn: "2026-01-15",
        programEndsOn: "2026-04-15",
      }),
      { active: false, reason: "after_end" },
    );
    assert.deepEqual(
      evaluateProgramWindow({
        dayDate: "2026-04-15",
        programWindowMonths: 3,
        programStartsOn: "2026-01-15",
        programEndsOn: "2026-04-15",
      }),
      { active: true },
    );
  });

  it("fills end from start + months when normalizing input", () => {
    assert.deepEqual(
      normalizeProgramWindowInput({
        programWindowMonths: 3,
        programStartsOn: "2026-02-01",
        programEndsOn: null,
      }),
      {
        programWindowMonths: 3,
        programStartsOn: "2026-02-01",
        programEndsOn: "2026-05-01",
      },
    );
  });
});

describe("decideAutoAddPlacement with program window", () => {
  it("still skips when already placed for the day", () => {
    assert.deepEqual(
      decideAutoAddPlacement({
        hasPlacementForDay: true,
        dayDate: "2026-02-01",
        programWindowMonths: 3,
        programStartsOn: "2026-01-01",
        programEndsOn: "2026-04-01",
      }),
      { action: "skip", reason: "already_placed" },
    );
  });

  it("creates inside the window and skips afterward", () => {
    assert.deepEqual(
      decideAutoAddPlacement({
        hasPlacementForDay: false,
        dayDate: "2026-02-01",
        programWindowMonths: 3,
        programStartsOn: "2026-01-01",
        programEndsOn: "2026-04-01",
      }),
      { action: "create" },
    );
    assert.deepEqual(
      decideAutoAddPlacement({
        hasPlacementForDay: false,
        dayDate: "2026-04-02",
        programWindowMonths: 3,
        programStartsOn: "2026-01-01",
        programEndsOn: "2026-04-01",
      }),
      { action: "skip", reason: "after_end" },
    );
  });

  it("leaves ongoing PT-style priorities unrestricted by dates", () => {
    assert.deepEqual(
      decideAutoAddPlacement({
        hasPlacementForDay: false,
        dayDate: "2026-10-21",
        programWindowMonths: null,
        programStartsOn: null,
        programEndsOn: null,
      }),
      { action: "create" },
    );
  });
});
