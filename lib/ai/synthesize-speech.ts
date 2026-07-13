import {
  getOpenAiTtsModel,
  getOpenAiTtsVoice,
  validateOpenAiTtsConfiguration,
} from "@/lib/env";
import { NARRATION_INSTRUCTIONS } from "@/lib/life-lab/narration-config";
import { OPENAI_NARRATION_MAX_INPUT_CHARS } from "@/lib/life-lab/narration-config";
import {
  categorizeOpenAiError,
  getNarrationUserMessage,
  type NarrationErrorCategory,
} from "@/lib/life-lab/narration-errors";
import { logNarrationDiagnostic } from "@/lib/life-lab/narration-diagnostics";
import { getOpenAIClient } from "@/lib/ai/openai-client";
import { AI_USAGE_FEATURES, logAiUsage } from "@/lib/ai/usage";

export type SynthesizeSpeechInput = {
  text: string;
  userId: string;
  model?: string;
  voice?: string;
  instructions?: string;
  noteId?: string | null;
};

export type SynthesizeSpeechResult = {
  audio: Buffer;
  model: string;
  voice: string;
  inputCharacters: number;
};

export class NarrationSynthesisError extends Error {
  category: NarrationErrorCategory;

  constructor(category: NarrationErrorCategory, message?: string) {
    super(message ?? getNarrationUserMessage(category));
    this.name = "NarrationSynthesisError";
    this.category = category;
  }
}

function validateSpeechInput(text: string): void {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new NarrationSynthesisError("empty_narration_text");
  }

  if (trimmed.length > OPENAI_NARRATION_MAX_INPUT_CHARS) {
    throw new NarrationSynthesisError("request_too_large");
  }
}

export async function synthesizeSpeech(
  input: SynthesizeSpeechInput,
): Promise<SynthesizeSpeechResult> {
  const config = validateOpenAiTtsConfiguration();

  if (!config.ok) {
    throw new NarrationSynthesisError(config.reason);
  }

  const model = input.model ?? config.model;
  const voice = input.voice ?? config.voice;
  const instructions = input.instructions ?? NARRATION_INSTRUCTIONS;

  validateSpeechInput(input.text);

  const openai = getOpenAIClient();

  try {
    const response = await openai.audio.speech.create({
      model,
      voice,
      input: input.text,
      instructions,
      response_format: "mp3",
    });

    const arrayBuffer = await response.arrayBuffer();
    const audio = Buffer.from(arrayBuffer);

    if (audio.byteLength === 0) {
      throw new NarrationSynthesisError(
        "unknown",
        "OpenAI returned empty audio.",
      );
    }

    void logAiUsage({
      userId: input.userId,
      feature: AI_USAGE_FEATURES.LIFE_LAB_NARRATION,
      model,
      usage: {
        input_tokens: input.text.length,
        output_tokens: 0,
        total_tokens: input.text.length,
      },
    });

    return {
      audio,
      model,
      voice,
      inputCharacters: input.text.length,
    };
  } catch (error) {
    if (error instanceof NarrationSynthesisError) {
      throw error;
    }

    const category = categorizeOpenAiError(error);

    logNarrationDiagnostic({
      stage: "openai-request",
      noteId: input.noteId ?? null,
      model,
      voice,
      inputLength: input.text.length,
      statusCode:
        typeof error === "object" &&
        error != null &&
        "status" in error &&
        typeof error.status === "number"
          ? error.status
          : null,
      errorType:
        error instanceof Error ? error.name : typeof error,
      errorMessage:
        error instanceof Error ? error.message : "OpenAI speech request failed.",
    });

    throw new NarrationSynthesisError(
      category,
      error instanceof Error ? error.message : undefined,
    );
  }
}

export function getDefaultOpenAiNarrationVoice(): string {
  return getOpenAiTtsVoice();
}

export function getDefaultOpenAiNarrationModel(): string {
  return getOpenAiTtsModel();
}
