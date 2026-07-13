import {
  buildReadAloudSections,
  readAloudSectionsToPlainText,
  type BuildReadAloudSectionsInput,
  type ReadAloudSection,
} from "@/lib/life-lab/read-aloud-sections";

/** @deprecated Use ReadAloudSection from read-aloud-sections.ts */
export type NarrationSection = {
  label: string;
  body: string;
};

export type NarrationDocumentInput = BuildReadAloudSectionsInput & {
  includeFlashcards?: boolean;
};

function toNarrationSection(section: ReadAloudSection): NarrationSection {
  return {
    label: section.title,
    body: section.text,
  };
}

export function buildNarrationDocument(
  input: NarrationDocumentInput,
): NarrationSection[] {
  return buildReadAloudSections({
    title: input.title,
    content: input.content,
    flashcards: input.includeFlashcards ? input.flashcards : undefined,
    inclusion: input.inclusion,
  }).map(toNarrationSection);
}

export function buildReadAloudSectionsFromNote(
  input: NarrationDocumentInput,
): ReadAloudSection[] {
  return buildReadAloudSections({
    title: input.title,
    content: input.content,
    flashcards: input.includeFlashcards ? input.flashcards : undefined,
    inclusion: input.inclusion,
  });
}

export function narrationDocumentToPlainText(
  sections: NarrationSection[] | ReadAloudSection[],
): string {
  if (sections.length === 0) {
    return "";
  }

  if ("body" in sections[0]) {
    return (sections as NarrationSection[])
      .map((section) => `${section.label}. ${section.body}`)
      .join("\n\n");
  }

  return readAloudSectionsToPlainText(sections as ReadAloudSection[]);
}

export {
  buildReadAloudSections,
  type ReadAloudSection,
} from "@/lib/life-lab/read-aloud-sections";
