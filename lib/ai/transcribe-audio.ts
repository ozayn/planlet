import { toFile } from "openai/uploads";

import {
  DEFAULT_TRANSCRIBE_MODEL,
  getOpenAIClient,
} from "@/lib/ai/openai-client";
import { AI_USAGE_FEATURES, logAiUsage } from "@/lib/ai/usage";

export type TranscribeAudioInput = {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  userId?: string;
};

export type TranscribeAudioResult = {
  transcript: string;
  language?: string;
};

export async function transcribeAudio(
  input: TranscribeAudioInput,
): Promise<TranscribeAudioResult> {
  const openai = getOpenAIClient();

  const file = await toFile(input.buffer, input.filename, {
    type: input.mimeType,
  });

  const response = await openai.audio.transcriptions.create({
    file,
    model: DEFAULT_TRANSCRIBE_MODEL,
  });

  if (input.userId) {
    void logAiUsage({
      userId: input.userId,
      feature: AI_USAGE_FEATURES.AUDIO_TRANSCRIPTION,
      model: DEFAULT_TRANSCRIBE_MODEL,
      usage: null,
    });
  }

  const transcript = response.text?.trim();

  if (!transcript) {
    throw new Error("Transcription returned empty text");
  }

  return {
    transcript,
    language:
      "language" in response && typeof response.language === "string"
        ? response.language
        : undefined,
  };
}
