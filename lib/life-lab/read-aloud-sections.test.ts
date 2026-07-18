import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildReadAloudSections,
  findReadAloudSectionIndex,
  readAloudSectionsToPlainText,
} from "@/lib/life-lab/read-aloud-sections";
import { buildReadAloudPlaybackPlan } from "@/lib/life-lab/narration-chunks";
import {
  applyLifeLabSpeechDisclosureVisibility,
  prepareLifeLabSpeechMarkdown,
} from "@/lib/life-lab/speech-renderer";

const SAMPLE_NOTE = {
  title: "Great Art Explained",
  content: [
    "# Great Art Explained",
    "",
    "## Short version",
    "A quick overview.",
    "",
    "## Summary",
    "A concise overview of the painting.",
    "",
    "## Source notes",
    "https://example.com/source",
    "",
    "```mermaid",
    "graph TD",
    "A-->B",
    "```",
    "",
    "## Key ideas",
    "- Composition matters",
    "- Color guides emotion",
    "",
    "## Summary",
    "Repeated heading body.",
  ].join("\n"),
};

describe("read aloud sections", () => {
  it("builds a shared section list without internal Title labels", () => {
    const sections = buildReadAloudSections(SAMPLE_NOTE);

    assert.equal(
      sections.some((section) => section.title === "Title"),
      false,
    );
    assert.equal(
      sections.some((section) => section.title === "Summary"),
      true,
    );
    assert.equal(
      sections.some((section) => section.title === "Source notes"),
      false,
    );
    assert.equal(
      sections.some((section) => section.title === "Key ideas"),
      true,
    );
  });

  it("excludes hidden and technical sections", () => {
    const sections = buildReadAloudSections({
      title: "Note",
      content: [
        "## Summary",
        "Readable.",
        "## Developer information",
        "Hidden.",
        "## Technical details",
        "Also hidden.",
      ].join("\n"),
    });

    assert.deepEqual(
      sections.map((section) => section.title),
      ["Note", "Summary"],
    );
  });

  it("creates stable unique ids for duplicate headings", () => {
    const sections = buildReadAloudSections(SAMPLE_NOTE);
    const summarySections = sections.filter((section) => section.title === "Summary");

    assert.equal(summarySections.length, 2);
    assert.notEqual(summarySections[0]?.id, summarySections[1]?.id);
    assert.match(summarySections[1]?.id ?? "", /summary-2$/);
  });

  it("respects optional flashcards and transcript inclusion settings", () => {
    const withoutOptional = buildReadAloudSections({
      title: "Study note",
      content: [
        "## Summary",
        "A note.",
        "## Full transcript",
        "Long transcript text.",
      ].join("\n"),
      flashcards: [{ question: "What is chiaroscuro?", answer: "Light and shadow." }],
      inclusion: {
        flashcards: false,
        fullTranscript: false,
      },
    });

    assert.equal(
      withoutOptional.some((section) => section.title === "Flashcards"),
      false,
    );
    assert.equal(
      withoutOptional.some((section) => section.title === "Full transcript"),
      false,
    );

    const withOptional = buildReadAloudSections({
      title: "Study note",
      content: "## Summary\nA note.",
      flashcards: [{ question: "What is chiaroscuro?", answer: "Light and shadow." }],
      inclusion: {
        flashcards: true,
        fullTranscript: true,
      },
    });

    assert.equal(
      withOptional.some((section) => section.title === "Flashcards"),
      true,
    );
  });

  it("finds the selected section index for playback start", () => {
    const sections = buildReadAloudSections(SAMPLE_NOTE);
    const keyIdeas = sections.find((section) => section.title === "Key ideas");

    assert.ok(keyIdeas);
    assert.equal(sections[findReadAloudSectionIndex(sections, keyIdeas.id)]?.id, keyIdeas.id);
  });

  it("falls back when a stored section id no longer exists", () => {
    const sections = buildReadAloudSections(SAMPLE_NOTE);

    assert.equal(findReadAloudSectionIndex(sections, "removed-section"), 0);
  });

  it("uses the same parser for playback chunk planning", () => {
    const sections = buildReadAloudSections(SAMPLE_NOTE);
    const plan = buildReadAloudPlaybackPlan(sections);
    const summaryRange = plan.sectionChunkRanges.find(
      (range) => range.sectionTitle === "Summary",
    );

    assert.ok(summaryRange);
    assert.equal(plan.chunks[summaryRange.firstChunkIndex]?.sectionId, summaryRange.sectionId);
    assert.match(plan.chunks[summaryRange.firstChunkIndex]?.text ?? "", /^Summary\./);
  });

  it("preserves Markdown heading order instead of category priority", () => {
    const sections = buildReadAloudSections({
      title: "Study note",
      content: [
        "## Short version",
        "Short.",
        "## Summary",
        "Summary body.",
        "## Key ideas",
        "Ideas body.",
        "## Learning Map",
        "Map body.",
        "## Connections",
        "Connections body.",
        "## Questions",
        "Questions body.",
      ].join("\n"),
      inclusion: {
        questions: true,
      },
    });

    assert.deepEqual(
      sections
        .filter((section) => section.category !== "NOTE_TITLE")
        .map((section) => section.title),
      [
        "Short version",
        "Summary",
        "Key ideas",
        "Learning Map",
        "Connections",
        "Questions",
      ],
    );
  });

  it("removes hidden sections without reordering remaining sections", () => {
    const sections = buildReadAloudSections({
      title: "Study note",
      content: [
        "## Summary",
        "Summary body.",
        "## Developer information",
        "Hidden.",
        "## Key ideas",
        "Ideas body.",
        "## Questions",
        "Questions body.",
      ].join("\n"),
      inclusion: {
        questions: true,
      },
    });

    assert.deepEqual(
      sections
        .filter((section) => section.category !== "NOTE_TITLE")
        .map((section) => section.title),
      ["Summary", "Key ideas", "Questions"],
    );
  });

  it("keeps duplicate headings in source order", () => {
    const sections = buildReadAloudSections({
      title: "Study note",
      content: [
        "## Summary",
        "First summary.",
        "## Key ideas",
        "Ideas.",
        "## Summary",
        "Second summary.",
      ].join("\n"),
    });

    assert.deepEqual(
      sections
        .filter((section) => section.category !== "NOTE_TITLE")
        .map((section) => section.title),
      ["Summary", "Key ideas", "Summary"],
    );
  });

  it("assigns increasing documentOrder in source sequence", () => {
    const sections = buildReadAloudSections({
      title: "Study note",
      content: [
        "## Summary",
        "Summary body.",
        "## Key ideas",
        "Ideas body.",
      ].join("\n"),
    });

    const documentOrders = sections.map((section) => section.documentOrder);

    assert.deepEqual(documentOrders, documentOrders.toSorted((left, right) => left - right));
    assert.equal(new Set(documentOrders).size, documentOrders.length);
  });

  it("reads structured values without presentation labels across note types", () => {
    const cases = [
      {
        title: "Podcast note",
        content:
          "## Participants\n\n**Role in the episode:** Interviewer\n\n**Context:** Challenges the guest.",
      },
      {
        title: "YouTube note",
        content:
          "## Vocabulary and phrasing\n\n**Meaning:** Political influence.\n\n**Why it is useful:** Useful for leadership.",
      },
      {
        title: "Reference note",
        content:
          "## Details\n\n**Publication date:** July 18, 2026\n\n**Study status:** Reviewed",
      },
    ];

    for (const fixture of cases) {
      const spoken = readAloudSectionsToPlainText(
        buildReadAloudSections(fixture),
      );

      assert.doesNotMatch(
        spoken,
        /Role in the episode|Meaning|Context|Why it is useful|Publication date|Study status/,
      );
    }

    const combined = cases
      .map((fixture) =>
        readAloudSectionsToPlainText(buildReadAloudSections(fixture)),
      )
      .join(" ");
    assert.match(combined, /Interviewer/);
    assert.match(combined, /Political influence/);
    assert.match(combined, /July 18, 2026/);
  });

  it("reads table values while omitting technical provenance", () => {
    const speechMarkdown = prepareLifeLabSpeechMarkdown({
      content: `## At a glance

| Item | Note |
|---|---|
| Role in the episode | Interviewer |
| Duration | 65 minutes |
| Transcript source | Local Whisper transcription |`,
    });
    const spoken = readAloudSectionsToPlainText(
      buildReadAloudSections({
        title: "Podcast",
        content: speechMarkdown,
      }),
    );

    assert.match(spoken, /Interviewer/);
    assert.match(spoken, /65 minutes/);
    assert.doesNotMatch(spoken, /Local Whisper transcription/);
    assert.doesNotMatch(
      spoken,
      /Role in the episode|Duration|Transcript source|Item|Note:/,
    );
  });

  it("reads timeline timestamps naturally without table headers", () => {
    const speechMarkdown = prepareLifeLabSpeechMarkdown({
      content: `## Timeline

| Time | Moment |
|---|---|
| 00:00 | Introduction |
| 03:15 | Main argument |`,
    });
    const spoken = readAloudSectionsToPlainText(
      buildReadAloudSections({
        title: "Episode",
        content: speechMarkdown,
        inclusion: { timeline: true },
      }),
    );

    assert.match(spoken, /Zero minutes\. Introduction/);
    assert.match(spoken, /Three minutes, fifteen seconds\. Main argument/);
    assert.doesNotMatch(spoken, /\bTime\b|\bMoment\b/);
  });

  it("reads important header values without their metadata labels", () => {
    const sections = buildReadAloudSections({
      title: "Episode title",
      content: "## Summary\nReadable summary.",
      headerValues: ["The Daily", "July 18, 2026", "65 minutes"],
    });
    const spoken = readAloudSectionsToPlainText(sections);

    assert.match(
      spoken,
      /^Episode title\. The Daily\. July 18, 2026\. 65 minutes/,
    );
    assert.doesNotMatch(spoken, /Show|Publication date|Duration/);
  });

  it("announces a Mermaid learning map without reading its source", () => {
    const sections = buildReadAloudSections({
      title: "Learning note",
      content: `## Learning Map

\`\`\`mermaid
graph TD
A[Political capital] --> B[Policy]
\`\`\``,
    });
    const spoken = readAloudSectionsToPlainText(sections);

    assert.match(spoken, /Learning Map/i);
    assert.doesNotMatch(spoken, /graph TD|Political capital.*Policy/);
  });

  it("skips collapsed sections and includes them after expansion", () => {
    const content = `## Summary

Visible summary.

## Timeline

- 00:00 Opening
- 05:00 Main argument`;
    const markdown = "## Timeline\n\n- 00:00 Opening\n- 05:00 Main argument";
    const collapsed = applyLifeLabSpeechDisclosureVisibility(content, [
      { id: "timeline", markdown, expanded: false },
    ]);
    const expanded = applyLifeLabSpeechDisclosureVisibility(content, [
      { id: "timeline", markdown, expanded: true },
    ]);

    assert.doesNotMatch(
      readAloudSectionsToPlainText(
        buildReadAloudSections({
          title: "Episode",
          content: collapsed,
          inclusion: { timeline: true },
        }),
      ),
      /Opening|Main argument/,
    );
    assert.match(
      readAloudSectionsToPlainText(
        buildReadAloudSections({
          title: "Episode",
          content: expanded,
          expandedSectionTitles: ["Timeline"],
        }),
      ),
      /Opening.*Main argument/,
    );
  });

  it("skips source notes by default and developer sections permanently", () => {
    const sections = buildReadAloudSections({
      title: "Note",
      content: `## Summary
Readable.

## Source notes
Source caveat.

## Developer information
Internal implementation detail.`,
      expandedSectionTitles: ["Developer information"],
    });
    const spoken = readAloudSectionsToPlainText(sections);

    assert.match(spoken, /Readable/);
    assert.doesNotMatch(spoken, /Source caveat|Developer|Internal implementation/);
  });

  it("includes source notes only after their disclosure is expanded", () => {
    const sections = buildReadAloudSections({
      title: "Note",
      content: `## Summary
Readable.

## Source notes
Detailed provenance caveat.`,
      expandedSectionTitles: ["Source notes"],
    });

    assert.match(
      readAloudSectionsToPlainText(sections),
      /Detailed provenance caveat/,
    );
  });

  it("removes decorative section numbering from speech headings", () => {
    const sections = buildReadAloudSections({
      title: "Lecture",
      content: "## Section 2: Main lessons\nA useful conclusion.",
    });

    assert.equal(sections[1]?.title, "Main lessons");
    assert.doesNotMatch(
      readAloudSectionsToPlainText(sections),
      /Section 2/,
    );
  });
});
