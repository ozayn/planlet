import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isMermaidScrollHintVisible,
  resolveMermaidSizeProfile,
} from "@/lib/life-lab/mermaid-viewport";

describe("life lab mermaid viewport", () => {
  it("chooses compact inline profiles on narrow portrait containers", () => {
    assert.equal(
      resolveMermaidSizeProfile({
        containerWidth: 390,
        variant: "inline",
        isLandscape: false,
      }),
      "compact",
    );
  });

  it("chooses landscape inline profiles on mobile landscape", () => {
    assert.equal(
      resolveMermaidSizeProfile({
        containerWidth: 844,
        variant: "inline",
        isLandscape: true,
      }),
      "landscape",
    );
  });

  it("uses dialog profiles in the focused viewer", () => {
    assert.equal(
      resolveMermaidSizeProfile({
        containerWidth: 390,
        variant: "dialog",
        isLandscape: false,
      }),
      "dialog",
    );
    assert.equal(
      resolveMermaidSizeProfile({
        containerWidth: 844,
        variant: "dialog",
        isLandscape: true,
      }),
      "landscape",
    );
  });

  it("shows scroll hints only when content exceeds the container", () => {
    assert.equal(
      isMermaidScrollHintVisible({ containerWidth: 360, contentWidth: 640 }),
      true,
    );
    assert.equal(
      isMermaidScrollHintVisible({ containerWidth: 360, contentWidth: 360 }),
      false,
    );
  });
});
