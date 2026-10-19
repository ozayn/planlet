import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  playPomodoroCompletionFeedback,
  warmPomodoroCompletionAudio,
} from "@/lib/pomodoro/feedback";

describe("pomodoro completion feedback", () => {
  it("no-ops safely when window is unavailable", () => {
    assert.doesNotThrow(() => {
      warmPomodoroCompletionAudio();
      playPomodoroCompletionFeedback(false);
      playPomodoroCompletionFeedback(true);
    });
  });
});
