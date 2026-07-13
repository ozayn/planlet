export type NarrationDiagnosticStage =
  | "feature-check"
  | "text-extraction"
  | "openai-request"
  | "audio-conversion"
  | "cache-read"
  | "cache-write"
  | "response";

export type NarrationDiagnosticLog = {
  stage: NarrationDiagnosticStage;
  noteId?: string | null;
  model?: string | null;
  voice?: string | null;
  inputLength?: number | null;
  statusCode?: number | null;
  errorType?: string | null;
  errorMessage?: string | null;
  sectionCount?: number | null;
  firstSectionLabel?: string | null;
  characterCount?: number | null;
  cacheWriteFailed?: boolean | null;
  audioByteSize?: number | null;
};

export function logNarrationDiagnostic(log: NarrationDiagnosticLog): void {
  console.error("[life-lab-narration]", JSON.stringify(log));
}

export function summarizeNarrationText(input: {
  characterCount: number;
  sectionCount: number;
  firstSectionLabel: string | null;
  isEmpty: boolean;
}): Pick<
  NarrationDiagnosticLog,
  "characterCount" | "sectionCount" | "firstSectionLabel"
> {
  return {
    characterCount: input.characterCount,
    sectionCount: input.sectionCount,
    firstSectionLabel: input.firstSectionLabel,
  };
}
