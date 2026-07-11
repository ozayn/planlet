import {
  getOpenAiTtsModel,
  getOpenAiTtsVoice,
} from "@/lib/env";
import { NARRATION_INSTRUCTIONS } from "@/lib/life-lab/narration-config";
import { getOpenAIClient } from "@/lib/ai/openai-client";
import { AI_USAGE_FEATURES, logAiUsage } from "@/lib/ai/usage";

export type SynthesizeSpeechInput = {
  text: string;
  userId: string;
  model?: string;
  voice?: string;
  instructions?: string;
};

export type SynthesizeSpeechResult = {
  audio: Buffer;
  model: string;
  voice: string;
  inputCharacters: number;
};

export async function synthesizeSpeech(
  input: SynthesizeSpeechInput,
): Promise<SynthesizeSpeechResult> {
  const model = input.model ?? getOpenAiTtsModel();
  const voice = input.voice ?? getOpenAiTtsVoice();
  const instructions = input.instructions ?? NARRATION_INSTRUCTIONS;
  const openai = getOpenAIClient();

  const response = await openai.audio.speech.create({
    model,
    voice,
    input: input.text,
    instructions,
  });

  const audio = Buffer.from(await response.arrayBuffer());

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
}

export function getDefaultOpenAiNarrationVoice(): string {
  return getOpenAiTtsVoice();
}

export function getDefaultOpenAiNarrationModel(): string {
  return getOpenAiTtsModel();
}
