import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shouldNotifyFeedback } from "@/lib/feedback";

describe("shouldNotifyFeedback", () => {
  it("notifies for non-admin feedback authors", () => {
    assert.equal(
      shouldNotifyFeedback({ role: "USER", canGiveFeedback: true }),
      true,
    );
  });

  it("skips notifications for admin feedback authors", () => {
    assert.equal(shouldNotifyFeedback({ role: "ADMIN" }), false);
  });
});
