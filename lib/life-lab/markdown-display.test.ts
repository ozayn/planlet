import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { isHiddenMarkdownSection } from "@/lib/life-lab/hidden-markdown-sections";
import { listDictionaryCandidateTerms } from "@/lib/life-lab/dictionary-candidates";
import {
  normalizeStructuredVocabularyFields,
  normalizeMarkdownListSpacing,
  prepareLifeLabMarkdownForReading,
  segmentStructuredVocabularyMarkdown,
  stripHiddenMarkdownSections,
} from "@/lib/life-lab/markdown-display";
import {
  auditLifeLabNoteQuality,
  suppressExactHeaderMetadataLines,
  suppressExactLifeLabMarkdownDuplicates,
} from "@/lib/life-lab/note-quality";
import {
  clearLifeLabReadingPreferences,
  DEFAULT_LIFE_LAB_READING_PREFERENCES,
  readLifeLabReadingPreferences,
  writeLifeLabReadingPreferences,
} from "@/lib/life-lab/reading-preferences";
import {
  buildStudyTargets,
  segmentBionicText,
  segmentStudyText,
} from "@/lib/life-lab/reading-text";

describe("life lab markdown display", () => {
  it("recognizes hidden section titles case-insensitively", () => {
    assert.equal(isHiddenMarkdownSection("Source note"), true);
    assert.equal(isHiddenMarkdownSection("DEVELOPER INFORMATION"), true);
    assert.equal(isHiddenMarkdownSection("Visual anchor"), true);
    assert.equal(isHiddenMarkdownSection("Core argument"), false);
  });

  it("strips Visual anchor sections from markdown bodies", () => {
    const body = [
      "## At a glance",
      "",
      "- Key point",
      "",
      "## Visual anchor",
      "",
      "- Image: The Two Fridas",
      "- Why this image: shows duality",
      "",
      "## Short version",
      "",
      "Summary text",
    ].join("\n");

    const stripped = stripHiddenMarkdownSections(body);

    assert.doesNotMatch(stripped, /Visual anchor/);
    assert.doesNotMatch(stripped, /Why this image/);
    assert.match(stripped, /## At a glance/);
    assert.match(stripped, /## Short version/);
  });

  it("strips hidden h2 sections from markdown bodies", () => {
    const body = [
      "# Title",
      "",
      "## Source note",
      "",
      "Internal only",
      "",
      "## Summary",
      "",
      "- Core argument",
      "- Main lessons",
    ].join("\n");

    const stripped = stripHiddenMarkdownSections(body);

    assert.doesNotMatch(stripped, /Source note/);
    assert.match(stripped, /## Summary/);
    assert.match(stripped, /- Core argument/);
  });

  it("inserts blank lines before list blocks when needed", () => {
    const body = "**Main lessons**\n- One\n- Two";
    const normalized = normalizeMarkdownListSpacing(body);

    assert.match(normalized, /\*\*Main lessons\*\*\n\n- One/);
  });

  it("prepares markdown for reading by hiding metadata and normalizing lists", () => {
    const prepared = prepareLifeLabMarkdownForReading(
      "## Developer information\n\nDebug\n\n## Learning Map\n\n**Topics**\n- Iran\n- Borders",
    );

    assert.doesNotMatch(prepared, /Developer information/);
    assert.match(prepared, /## Learning Map/);
    assert.match(prepared, /\*\*Topics\*\*\n\n- Iran/);
  });

  it("hides transcript status headings", () => {
    const prepared = prepareLifeLabMarkdownForReading(
      "## Summary\n\nOverview.\n\n## Transcript status\n\nUnavailable.",
    );

    assert.doesNotMatch(prepared, /Transcript status/i);
    assert.match(prepared, /Overview/);
  });

  it("separates multiple English phrase fields onto label and value lines", () => {
    const normalized = normalizeStructuredVocabularyFields(
      `## Interesting English words and phrases

**political capital**

**Meaning:** Influence or goodwill. **Why it is useful:** Useful for leadership.

**Context:** Used to describe accumulated influence.

**My example sentence:** She used her political capital.`,
    );

    assert.match(normalized, /\*\*Meaning:\*\*  \nInfluence or goodwill\./);
    assert.match(
      normalized,
      /\*\*Why it is useful:\*\*  \nUseful for leadership\./,
    );
    assert.match(normalized, /\*\*Context:\*\*  \nUsed to describe/);
    assert.match(normalized, /\*\*My example sentence:\*\*  \nShe used/);
  });

  it("preserves nested Persian vocabulary bullets", () => {
    const normalized = normalizeStructuredVocabularyFields(
      `## Persian vocabulary and phrasing

- **سرمایه سیاسی**
  - **Meaning:** نفوذ و اعتبار
  - **Possible English equivalent:** political capital`,
    );

    assert.match(normalized, /  - \*\*Meaning:\*\*  \n    نفوذ و اعتبار/);
    assert.match(
      normalized,
      /  - \*\*Possible English equivalent:\*\*  \n    political capital/,
    );
  });

  it("supports entries with missing optional fields", () => {
    const normalized = normalizeStructuredVocabularyFields(
      `## Dictionary entries

**leverage**

Meaning: An advantage that can be used.`,
    );

    assert.match(normalized, /\*\*Meaning:\*\*  \nAn advantage/);
    assert.doesNotMatch(normalized, /Context|My example sentence/);
  });

  it("scopes vocabulary formatting to recognized sections", () => {
    const segments = segmentStructuredVocabularyMarkdown(
      `## Summary

The meaning: context matters in ordinary prose.

## Vocabulary and phrasing

**Meaning:** A structured definition.

## Analysis

Context: this remains ordinary prose.`,
    );

    assert.equal(segments.length, 3);
    assert.equal(segments[0]?.structuredVocabulary, false);
    assert.equal(segments[1]?.structuredVocabulary, true);
    assert.equal(segments[2]?.structuredVocabulary, false);
    assert.match(segments[0]?.content ?? "", /meaning: context/);
    assert.match(segments[2]?.content ?? "", /Context: this remains/);
  });

  it("uses semantic fields with compact mobile-safe wrapping", () => {
    const root = join(import.meta.dirname, "../..");
    const component = readFileSync(
      join(root, "components/life-lab/markdown-content.tsx"),
      "utf8",
    );
    const styles = readFileSync(join(root, "app/globals.css"), "utf8");

    assert.match(component, /<dl className="ui-vocabulary-field">/);
    assert.match(component, /<dt>\{field\.label\}<\/dt>/);
    assert.match(component, /<dd \{\.\.\.withTextDirection/);
    assert.match(styles, /\.ui-vocabulary-field dd[\s\S]*?overflow-wrap: anywhere/);
    assert.match(
      styles,
      /\.ui-markdown-compact \.ui-vocabulary-field[\s\S]*?margin-block: 0\.5rem/,
    );
  });

  it("hides a leading H1 that duplicates the page title", () => {
    const rendered = suppressExactLifeLabMarkdownDuplicates(
      "# Political Capital\n\n## Summary\n\nUseful context.",
      "Political Capital",
    );

    assert.doesNotMatch(rendered, /^# Political Capital/m);
    assert.match(rendered, /^## Summary/m);
  });

  it("suppresses exact repeated paragraphs but preserves meaningful variants", () => {
    const repeated =
      "This paragraph explains a sufficiently detailed central argument.";
    const variant =
      "This paragraph explains a sufficiently detailed central argument and its practical consequence.";
    const rendered = suppressExactLifeLabMarkdownDuplicates(
      `## Short version\n\n${repeated}\n\n## Summary\n\n${repeated}\n\n${variant}`,
    );

    assert.equal(rendered.match(/sufficiently detailed central argument\./g)?.length, 1);
    assert.match(rendered, /and its practical consequence/);
  });

  it("keeps distinct Key ideas and Main arguments sections", () => {
    const rendered = suppressExactLifeLabMarkdownDuplicates(
      `## Key ideas

- Affordability can create a broad coalition.

## Main arguments

- Governing results are the strongest answer to ideological attacks.`,
    );

    assert.match(rendered, /## Key ideas/);
    assert.match(rendered, /## Main arguments/);
    assert.match(rendered, /Affordability can create/);
    assert.match(rendered, /Governing results/);
  });

  it("omits Timeline only when it exactly duplicates Outline", () => {
    const rendered = suppressExactLifeLabMarkdownDuplicates(
      `## Episode outline

- Opening challenge
- Policy response

## Timeline

- Opening challenge
- Policy response`,
    );

    assert.match(rendered, /## Episode outline/);
    assert.doesNotMatch(rendered, /## Timeline/);
  });

  it("suppresses only exact header metadata values", () => {
    const rendered = suppressExactHeaderMetadataLines(
      `## At a glance

| Show | The Daily |
| Guest | Zohran Mamdani |
| Platform | Apple Podcasts with RSS context |`,
      { show: "The Daily", platform: "Apple Podcasts" },
    );

    assert.doesNotMatch(rendered, /\| Show \| The Daily \|/);
    assert.match(rendered, /\| Guest \| Zohran Mamdani \|/);
    assert.match(rendered, /Apple Podcasts with RSS context/);
  });

  it("renders Dictionary candidates as a concise unique term list", () => {
    const terms = listDictionaryCandidateTerms(`- **political capital** — Meaning: influence
- **big tent**
  - **Meaning:** a broad coalition
- political capital`);

    assert.deepEqual(terms, ["political capital", "big tent"]);
  });

  it("reports source repetition once and keeps print content coherent", () => {
    const sourceStatement =
      "Transcript source: Local Whisper transcription from public audio.";
    const content = `## At a glance

${sourceStatement}

## Source notes

${sourceStatement}

Additional caveats about proper-name accuracy remain visible.`;
    const issues = auditLifeLabNoteQuality({ content });
    const rendered = suppressExactLifeLabMarkdownDuplicates(content);

    assert.equal(
      issues.filter((issue) => issue.kind === "duplicate-paragraph").length,
      1,
    );
    assert.equal(rendered.match(/Transcript source:/g)?.length, 1);
    assert.match(rendered, /Additional caveats/);
  });

  it("sources repeated Life Lab interface labels from shared constants", () => {
    const root = join(import.meta.dirname, "../..");
    const labels = readFileSync(
      join(root, "lib/life-lab/ui-labels.ts"),
      "utf8",
    );
    const episode = readFileSync(
      join(root, "components/life-lab/life-lab-podcast-episode.tsx"),
      "utf8",
    );

    assert.match(labels, /openOriginalEpisode: "Open original episode"/);
    assert.match(labels, /showFullTimeline: "Show full timeline"/);
    assert.match(episode, /LIFE_LAB_UI_LABELS\.openOriginalEpisode/);
    assert.match(episode, /LIFE_LAB_UI_LABELS\.showFullTimeline/);
  });

  it("segments conservative Bionic prose without changing readable text", () => {
    const source =
      "A readable paragraph, Planlet links https://example.com, and tiny words.";
    const segments = segmentBionicText(source);

    assert.equal(segments.map((segment) => segment.text).join(""), source);
    assert.ok(
      segments.some(
        (segment) => segment.emphasized && segment.text === "rea",
      ),
    );
    assert.equal(
      segments.some(
        (segment) =>
          segment.emphasized &&
          /Planlet|https|tiny\b/.test(segment.text),
      ),
      false,
    );
  });

  it("leaves Persian and mixed RTL text untouched in Bionic mode", () => {
    const source = "این متن فارسی includes English words safely.";
    const segments = segmentBionicText(source);

    assert.deepEqual(segments, [{ text: source, emphasized: false }]);
  });

  it("uses semantic metadata only for Study emphasis", () => {
    const source =
      "Zohran Mamdani discussed democratic socialism with the City Council and آزادی.";
    const targets = buildStudyTargets({
      term: "آزادی",
      concepts: ["democratic socialism"],
      people: ["Zohran Mamdani"],
      organizations: ["City Council"],
    });
    const segments = segmentStudyText(source, targets);

    assert.equal(segments.map((segment) => segment.text).join(""), source);
    assert.deepEqual(
      segments
        .filter((segment) => segment.target)
        .map((segment) => segment.target?.kind),
      ["person", "concept", "organization", "term"],
    );
  });

  it("persists and resets shared Life Lab reading preferences", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem(key: string) {
        return values.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        values.set(key, value);
      },
      removeItem(key: string) {
        values.delete(key);
      },
    };
    const preferences = {
      ...DEFAULT_LIFE_LAB_READING_PREFERENCES,
      readingMode: "focus" as const,
      readingFontSize: "large" as const,
      readingHighContrast: true,
    };

    writeLifeLabReadingPreferences(storage, preferences);
    assert.deepEqual(readLifeLabReadingPreferences(storage), preferences);
    clearLifeLabReadingPreferences(storage);
    assert.deepEqual(
      readLifeLabReadingPreferences(storage),
      DEFAULT_LIFE_LAB_READING_PREFERENCES,
    );
  });

  it("wires shared controls, clean speech, responsive modes, and normal print", () => {
    const root = join(import.meta.dirname, "../..");
    const page = readFileSync(
      join(root, "app/(app)/life-lab/[section]/[slug]/page.tsx"),
      "utf8",
    );
    const markdown = readFileSync(
      join(root, "components/life-lab/markdown-content.tsx"),
      "utf8",
    );
    const speech = readFileSync(
      join(root, "lib/life-lab/speech-renderer.ts"),
      "utf8",
    );
    const styles = readFileSync(join(root, "app/globals.css"), "utf8");

    assert.match(page, /<LifeLabReadingModeProvider metadata=\{note\.metadata\}>/);
    assert.match(page, /<LifeLabReadingControls \/>/);
    assert.match(markdown, /mode=\{readingMode\}/);
    assert.doesNotMatch(speech, /ReadableText|ui-bionic-prefix/);
    assert.match(styles, /\.ui-reading-controls-panel[\s\S]*?width: min/);
    assert.match(styles, /data-reading-mode="comfortable"/);
    assert.match(styles, /data-reading-mode="dense"/);
    assert.match(
      styles,
      /@media print[\s\S]*?\.ui-bionic-prefix[\s\S]*?font-weight: inherit/,
    );
  });
});
