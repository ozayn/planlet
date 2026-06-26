import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getPokeNotificationLine } from "@/lib/poke-labels";

describe("getPokeNotificationLine", () => {
  it("formats encouragement lines with emoji and sender name", () => {
    assert.equal(
      getPokeNotificationLine({
        senderName: "Azin",
        senderEmail: null,
        pokeType: "ENCOURAGE",
      }),
      "🌱 Azin sent you encouragement.",
    );
  });

  it("formats check-in lines", () => {
    assert.equal(
      getPokeNotificationLine({
        senderName: "Nazanin",
        senderEmail: null,
        pokeType: "CHECK_IN",
      }),
      "☕ Nazanin checked in.",
    );
  });
});
