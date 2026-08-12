import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "node:test";

import { LifeLabCompactSourceMeta } from "@/components/life-lab/life-lab-compact-source-meta";
import { LifeLabPrimaryActions } from "@/components/life-lab/life-lab-primary-actions";

function captureReactKeyWarnings(render: () => void): string[] {
  const warnings: string[] = [];
  const originalError = console.error;

  console.error = (...args: unknown[]) => {
    const message = args.map(String).join(" ");
    if (/unique "key" prop/i.test(message)) {
      warnings.push(message);
    }
  };

  try {
    render();
  } finally {
    console.error = originalError;
  }

  return warnings;
}

describe("Life Lab note header React keys", () => {
  it("renders compact source meta without key warnings", () => {
    const warnings = captureReactKeyWarnings(() => {
      renderToString(
        createElement(LifeLabCompactSourceMeta, {
          channelLabel: "BBC",
          platformLabel: "YouTube",
          dateLabel: "Aug 12, 2026",
          sourceHref: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          statusLabel: "New",
        }),
      );
    });

    assert.deepEqual(warnings, []);
  });

  it("renders primary action slots without key warnings", () => {
    const warnings = captureReactKeyWarnings(() => {
      renderToString(
        createElement(LifeLabPrimaryActions, {
          listen: createElement("button", { type: "button" }, "Listen"),
          exportPdf: createElement("button", { type: "button" }, "Export PDF"),
          more: createElement("button", { type: "button" }, "More"),
        }),
      );
    });

    assert.deepEqual(warnings, []);
  });
});
