import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  markdownToSpeechText,
  preservesMeaningfulListNumbering,
} from "@/lib/life-lab/markdown-to-speech";
import {
  buildNarrationPlaybackChunks,
} from "@/lib/life-lab/narration-chunks";
import { buildReadAloudSections } from "@/lib/life-lab/read-aloud-sections";
import { prepareFlashcardSpeechText } from "@/lib/life-lab/speech";

describe("markdown to speech pipeline", () => {
  it("never speaks bullet markers", () => {
    const spoken = markdownToSpeechText(
      [
        "- Aristotle founded the Lyceum.",
        "* Plato founded the Academy.",
        "+ Epicurus founded the Garden.",
        "• Zeno taught in the Stoa.",
      ].join("\n"),
    );

    assert.equal(
      spoken,
      "Aristotle founded the Lyceum. Plato founded the Academy. Epicurus founded the Garden. Zeno taught in the Stoa.",
    );
    assert.doesNotMatch(spoken, /\b(dash|asterisk|bullet)\b/i);
    assert.doesNotMatch(spoken, /(^|\s)[-*+](\s|$)/);
  });

  it("turns ordinary numbered Markdown lists into natural statements", () => {
    const spoken = markdownToSpeechText(
      ["1. Aristotle founded the Lyceum.", "2. Plato founded the Academy."].join(
        "\n",
      ),
    );

    assert.equal(
      spoken,
      "Aristotle founded the Lyceum. Plato founded the Academy.",
    );
    assert.doesNotMatch(spoken, /\b(one|two|1\.|2\.)\b/i);
  });

  it("preserves meaningful numbering inside list items", () => {
    assert.equal(preservesMeaningfulListNumbering("Step 1: Gather tools"), true);
    assert.equal(preservesMeaningfulListNumbering("Lesson 2"), true);
    assert.equal(preservesMeaningfulListNumbering("Aristotle founded"), false);

    const spoken = markdownToSpeechText(
      [
        "1. Step 1: Gather materials.",
        "2. Lesson 2 introduces ethics.",
        "3. Principle 3 guides practice.",
        "4. Article 5 summarizes rights.",
      ].join("\n"),
    );

    assert.match(spoken, /Step 1/);
    assert.match(spoken, /Lesson 2/);
    assert.match(spoken, /Principle 3/);
    assert.match(spoken, /Article 5/);
    assert.doesNotMatch(spoken, /\bOne\b|\bTwo\b|\bThree\b|\bFour\b/);
  });

  it("skips Mermaid and code blocks", () => {
    const spoken = markdownToSpeechText(
      [
        "Intro.",
        "```mermaid",
        "graph LR",
        "A-->B",
        "```",
        "```js",
        "const x = 1",
        "```",
        "Outro.",
      ].join("\n"),
    );

    assert.equal(spoken, "Intro. Outro.");
    assert.doesNotMatch(spoken, /graph LR|const x|```/);
  });

  it("reads blockquotes naturally without greater-than", () => {
    const spoken = markdownToSpeechText(
      ["> Knowledge is virtue.", "> Habit shapes character."].join("\n"),
    );

    assert.equal(spoken, "Knowledge is virtue. Habit shapes character.");
    assert.doesNotMatch(spoken, /greater than|>/i);
  });

  it("ignores horizontal rules", () => {
    const spoken = markdownToSpeechText(
      ["Before.", "---", "***", "___", "After."].join("\n"),
    );

    assert.equal(spoken, "Before. After.");
  });

  it("converts tables into readable prose without pipes", () => {
    const spoken = markdownToSpeechText(
      [
        "| Thinker | School |",
        "| --- | --- |",
        "| Aristotle | Lyceum |",
        "| Plato | Academy |",
      ].join("\n"),
    );

    assert.match(spoken, /Thinker:\s*Aristotle/i);
    assert.match(spoken, /School:\s*Lyceum/i);
    assert.match(spoken, /Plato/);
    assert.doesNotMatch(spoken, /\|/);
  });

  it("skips bare URLs and keeps link labels", () => {
    const spoken = markdownToSpeechText(
      [
        "Read the [BBC article](https://example.com/article).",
        "https://example.com/raw",
        "See https://example.com/docs for details.",
      ].join("\n"),
    );

    assert.match(spoken, /BBC article/);
    assert.match(spoken, /See for details/);
    assert.doesNotMatch(spoken, /https?:|example\.com/);
  });

  it("reads flashcard lists naturally", () => {
    const segments = prepareFlashcardSpeechText({
      question: ["What founded the Lyceum?", "- Aristotle", "* Later students"].join(
        "\n",
      ),
      answer: ["1. Teaching continued", "2. Step 2 preserved method"].join("\n"),
      revealed: true,
    });

    assert.equal(
      segments[0],
      "What founded the Lyceum? Aristotle. Later students.",
    );
    assert.match(segments[1] ?? "", /Teaching continued/);
    assert.match(segments[1] ?? "", /Step 2 preserved method/);
    assert.doesNotMatch(segments.join(" "), /(^|\s)[-*](\s|$)|```/);
  });

  it("uses the same pipeline for Device Voice and OpenAI chunk text", () => {
    const markdown = [
      "## Key ideas",
      "- Aristotle founded the Lyceum.",
      "* Plato founded the Academy.",
      "",
      "```mermaid",
      "graph TD",
      "A-->B",
      "```",
    ].join("\n");

    const expectedBody = markdownToSpeechText(
      ["- Aristotle founded the Lyceum.", "* Plato founded the Academy."].join(
        "\n",
      ),
    );

    const sections = buildReadAloudSections({
      title: "Schools",
      content: markdown,
      inclusion: {
        summary: true,
        coreArgument: true,
        keyIdeas: true,
        peopleConcepts: true,
        mainLessons: true,
        questions: true,
        whatToRemember: true,
        timeline: true,
        fullTranscript: false,
        flashcards: false,
      },
    });

    const keyIdeas = sections.find((section) => section.title === "Key ideas");
    assert.ok(keyIdeas);
    assert.equal(keyIdeas?.text, `${expectedBody} Learning map.`);
    assert.doesNotMatch(keyIdeas?.text ?? "", /graph TD|```|-\s/);

    const chunks = buildNarrationPlaybackChunks(sections);
    const keyChunk = chunks.find((chunk) => chunk.sectionTitle === "Key ideas");
    assert.ok(keyChunk);
    assert.match(keyChunk?.text ?? "", /Aristotle founded the Lyceum/);
    assert.match(keyChunk?.text ?? "", /Plato founded the Academy/);
    assert.doesNotMatch(keyChunk?.text ?? "", /\b(dash|asterisk)\b/i);
  });
});
