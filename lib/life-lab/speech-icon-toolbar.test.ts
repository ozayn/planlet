import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("speech icon toolbar", () => {
  const root = join(import.meta.dirname, "../..");
  const toolbar = readFileSync(
    join(root, "components/life-lab/speech-icon-toolbar.tsx"),
    "utf8",
  );
  const controls = readFileSync(
    join(root, "components/life-lab/read-aloud-controls.tsx"),
    "utf8",
  );
  const noteReadAloud = readFileSync(
    join(root, "components/life-lab/life-lab-note-read-aloud.tsx"),
    "utf8",
  );

  it("exposes a reusable monochrome icon toolbar", () => {
    assert.match(toolbar, /data-speech-toolbar="icon"/);
    assert.match(toolbar, /h-9 w-9/);
    assert.match(toolbar, /ui-icon-action-quiet/);
    assert.match(toolbar, /aria-label=\{label\}/);
    assert.match(toolbar, /ui-tooltip-bubble/);
    assert.match(toolbar, /AudioLines/);
    assert.match(toolbar, /Gauge/);
    assert.match(toolbar, /Settings2/);
    assert.doesNotMatch(toolbar, /bg-blue|text-purple|gradient/i);
  });

  it("keeps flashcard primary actions as one-tap icons", () => {
    assert.match(controls, /SpeechIconToolbar/);
    assert.match(controls, /Read question/);
    assert.match(controls, /Read answer/);
    assert.match(controls, /Read both/);
    assert.match(controls, /SPEECH_TOOLBAR_ICONS\.stop/);
    assert.match(controls, /developerMode/);
    assert.doesNotMatch(controls, /ControlButton/);
    assert.doesNotMatch(controls, /SpeechDevDiagnostic/);
  });

  it("shares the same ReadAloudControls path for note read aloud", () => {
    assert.match(noteReadAloud, /ReadAloudControls/);
  });
});
