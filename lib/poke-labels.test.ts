import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getPokeNotificationLine,
  getReceivedPokeHistoryLine,
  getSentPokeHistoryLine,
} from "@/lib/poke-labels";

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

describe("poke history lines", () => {
  it("formats received history lines", () => {
    assert.equal(
      getReceivedPokeHistoryLine({
        pokeType: "ENCOURAGE",
        sender: { name: "Nazanin", email: null },
      }),
      "Encourage from Nazanin",
    );
  });

  it("formats sent history lines", () => {
    assert.equal(
      getSentPokeHistoryLine({
        pokeType: "CELEBRATE",
        recipient: { name: "Arash", email: null },
      }),
      "Celebrate sent to Arash",
    );
  });
});
