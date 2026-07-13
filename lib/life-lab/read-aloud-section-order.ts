import { isLifeLabDevToolsEnabled } from "@/lib/life-lab/dev";
import { listRenderedVisibleSectionTitles } from "@/lib/life-lab/note-content-blocks";
import { prepareLifeLabMarkdownForReading } from "@/lib/life-lab/markdown-display";
import type { BuildReadAloudSectionsInput } from "@/lib/life-lab/read-aloud-sections";
import {
  buildReadAloudSections,
  getReadAloudSectionIds,
  listMarkdownReadableSectionTitles,
} from "@/lib/life-lab/read-aloud-sections";

export type ReadAloudSectionOrderDiagnostic = {
  renderedSectionTitles: string[];
  markdownSectionTitles: string[];
  narrationSectionIds: string[];
  narrationSectionTitles: string[];
  deviceVoiceSectionIds: string[];
  openAiSectionIds: string[];
  firstMismatch: string | null;
};

export function compareReadAloudSectionOrder(
  input: BuildReadAloudSectionsInput,
): ReadAloudSectionOrderDiagnostic {
  const preparedContent = prepareLifeLabMarkdownForReading(input.content);
  const sections = buildReadAloudSections(input);
  const narrationSectionIds = sections.map((section) => section.id);
  const narrationSectionTitles = sections
    .filter((section) => section.category !== "NOTE_TITLE")
    .map((section) => section.title);
  const renderedSectionTitles = listRenderedVisibleSectionTitles(preparedContent);
  const markdownSectionTitles = listMarkdownReadableSectionTitles(input.content);

  const includedRenderedTitles = renderedSectionTitles.filter((title) =>
    narrationSectionTitles.includes(title),
  );

  let firstMismatch: string | null = null;

  for (let index = 0; index < narrationSectionTitles.length; index += 1) {
    const narrationTitle = narrationSectionTitles[index];
    const renderedTitle = includedRenderedTitles[index];

    if (narrationTitle !== renderedTitle) {
      firstMismatch = `index ${index}: narration "${narrationTitle ?? "missing"}" vs rendered "${renderedTitle ?? "missing"}"`;
      break;
    }
  }

  if (!firstMismatch && includedRenderedTitles.length !== narrationSectionTitles.length) {
    firstMismatch = `length ${narrationSectionTitles.length} vs rendered ${includedRenderedTitles.length}`;
  }

  return {
    renderedSectionTitles,
    markdownSectionTitles,
    narrationSectionIds,
    narrationSectionTitles,
    deviceVoiceSectionIds: narrationSectionIds,
    openAiSectionIds: narrationSectionIds,
    firstMismatch,
  };
}

export function logReadAloudSectionOrderDiagnostic(
  noteId: string,
  input: BuildReadAloudSectionsInput,
): void {
  if (!isLifeLabDevToolsEnabled()) {
    return;
  }

  const diagnostic = compareReadAloudSectionOrder(input);

  console.error(
    "[life-lab-narration-order]",
    JSON.stringify({
      noteId,
      renderedSectionTitles: diagnostic.renderedSectionTitles,
      narrationSectionIds: diagnostic.narrationSectionIds,
      narrationSectionTitles: diagnostic.narrationSectionTitles,
      deviceVoiceSectionIds: diagnostic.deviceVoiceSectionIds,
      openAiSectionIds: diagnostic.openAiSectionIds,
      firstMismatch: diagnostic.firstMismatch,
    }),
  );
}

export { getReadAloudSectionIds };
