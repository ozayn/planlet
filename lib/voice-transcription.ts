export type VoiceTranscriptMode = "replace" | "append";

export function combineVoiceTranscript(
  current: string,
  transcript: string,
  mode: VoiceTranscriptMode = "replace",
): string {
  const trimmed = transcript.trim();

  if (!trimmed) {
    return current;
  }

  const existing = current.trim();

  if (mode === "append" && existing) {
    return `${existing}\n\n${trimmed}`;
  }

  return trimmed;
}
