"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  updateLifeLabReadAloudProviderAction,
  updateLifeLabSpeechRateAction,
  updateLifeLabSpeechVoiceAction,
} from "@/app/(app)/settings/actions";
import { SettingsSection } from "@/components/settings/settings-section";
import type { LifeLabReadAloudPreferences } from "@/lib/life-lab/read-aloud-preferences";
import {
  READ_ALOUD_PROVIDER_LABELS,
} from "@/lib/life-lab/narration-config";
import {
  createSpeechUtterance,
  encodeDeviceVoiceId,
  formatSpeechRate,
  formatSpeechVoiceLabel,
  isSpeechSynthesisSupported,
  listAllDeviceSpeechVoices,
  loadSpeechSynthesisVoices,
  resolveDeviceVoiceWithFallback,
  SPEECH_AUTO_VOICE_ID,
  SPEECH_RATE_OPTIONS,
  type SpeechRate,
} from "@/lib/life-lab/speech";

const VOICE_PREVIEW_TEXT =
  "Hi, this is a preview of your selected reading voice.";

type SettingsReadAloudProps = {
  preferences: LifeLabReadAloudPreferences;
  openAiNarrationAvailable: boolean;
  embedded?: boolean;
};

export function SettingsReadAloud({
  preferences,
  openAiNarrationAvailable,
  embedded = false,
}: SettingsReadAloudProps) {
  const router = useRouter();
  const [provider, setProvider] = useState(preferences.provider);
  const [speechVoiceId, setSpeechVoiceId] = useState(preferences.speechVoiceId);
  const [speechRate, setSpeechRate] = useState<SpeechRate>(preferences.speechRate);
  const [deviceVoices, setDeviceVoices] = useState<
    ReturnType<typeof listAllDeviceSpeechVoices>
  >([]);
  const [rawVoices, setRawVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setProvider(preferences.provider);
    setSpeechVoiceId(preferences.speechVoiceId);
    setSpeechRate(preferences.speechRate);
  }, [preferences]);

  useEffect(() => {
    if (!isSpeechSynthesisSupported()) {
      return;
    }

    function loadVoices(): void {
      const voices = window.speechSynthesis.getVoices();
      setRawVoices(voices);
      setDeviceVoices(listAllDeviceSpeechVoices(voices));
    }

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  function saveProvider(nextProvider: "DEVICE" | "OPENAI") {
    if (nextProvider === provider || isPending) {
      return;
    }

    setProvider(nextProvider);
    setError(null);

    startTransition(async () => {
      const result = await updateLifeLabReadAloudProviderAction(nextProvider);

      if (!result.success) {
        setProvider(provider);
        setError(result.error ?? "Couldn't save provider.");
        return;
      }

      router.refresh();
    });
  }

  function saveVoice(nextVoiceId: string) {
    if (nextVoiceId === speechVoiceId || isPending) {
      return;
    }

    setSpeechVoiceId(nextVoiceId);
    setError(null);

    startTransition(async () => {
      const result = await updateLifeLabSpeechVoiceAction(nextVoiceId);

      if (!result.success) {
        setSpeechVoiceId(speechVoiceId);
        setError(result.error ?? "Couldn't save voice.");
        return;
      }

      router.refresh();
    });
  }

  const resolved = resolveDeviceVoiceWithFallback(rawVoices, speechVoiceId);
  const isAutoVoice = speechVoiceId === SPEECH_AUTO_VOICE_ID;
  // Keep the <select> value aligned with an existing option even when the saved
  // id is a legacy format, by mapping it back to the resolved voice's stable id.
  const selectValue = isAutoVoice
    ? SPEECH_AUTO_VOICE_ID
    : resolved.voice
      ? encodeDeviceVoiceId(resolved.voice)
      : speechVoiceId;
  const selectedVoiceLabel = resolved.voice
    ? formatSpeechVoiceLabel(resolved.voice)
    : null;

  function previewVoice() {
    if (!isSpeechSynthesisSupported()) {
      return;
    }

    void loadSpeechSynthesisVoices().then((voices) => {
      const { voice } = resolveDeviceVoiceWithFallback(voices, speechVoiceId);
      const utterance = createSpeechUtterance(VOICE_PREVIEW_TEXT, {
        rate: speechRate,
        pitch: 1,
        volume: 1,
        lang: voice?.lang,
        voice,
      });

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
  }

  function saveRate(nextRate: SpeechRate) {
    if (nextRate === speechRate || isPending) {
      return;
    }

    setSpeechRate(nextRate);
    setError(null);

    startTransition(async () => {
      const result = await updateLifeLabSpeechRateAction(nextRate);

      if (!result.success) {
        setSpeechRate(speechRate);
        setError(result.error ?? "Couldn't save rate.");
        return;
      }

      router.refresh();
    });
  }

  const content = (
    <>
      <fieldset id="narration-provider" className="space-y-3 scroll-mt-4">
        <legend className="sr-only">Read aloud provider</legend>
        {(["DEVICE", "OPENAI"] as const).map((option) => {
          const disabled =
            option === "OPENAI" && !openAiNarrationAvailable;

          return (
            <label
              key={option}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors ${
                provider === option
                  ? "border-border bg-accent-cream/30"
                  : "border-border/70"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <input
                type="radio"
                name="life-lab-read-aloud-provider"
                value={option}
                checked={provider === option}
                disabled={disabled || isPending}
                onChange={() => saveProvider(option)}
                className="mt-1"
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium text-foreground">
                  {READ_ALOUD_PROVIDER_LABELS[option].title}
                </span>
                <span className="block text-xs leading-relaxed text-muted">
                  {READ_ALOUD_PROVIDER_LABELS[option].description}
                </span>
                {disabled ? (
                  <span className="block text-xs text-muted-light">
                    OpenAI narration is unavailable on this server.
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </fieldset>

      {provider === "DEVICE" ? (
        <div id="narration-voice" className="space-y-3 border-t border-border-soft pt-4 scroll-mt-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Device voice</span>
            <select
              value={selectValue}
              disabled={isPending || deviceVoices.length === 0}
              onChange={(event) => saveVoice(event.target.value)}
              className="rounded-xl border border-border/70 bg-transparent px-3 py-2 text-sm text-foreground"
            >
              <option value={SPEECH_AUTO_VOICE_ID}>Auto</option>
              {deviceVoices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={previewVoice}
              disabled={deviceVoices.length === 0}
              className="rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              Preview voice
            </button>
            <span className="text-xs text-muted">
              {isAutoVoice
                ? selectedVoiceLabel
                  ? `Auto — ${selectedVoiceLabel}`
                  : "Auto"
                : selectedVoiceLabel
                  ? `Selected: ${selectedVoiceLabel}`
                  : "Selected voice unavailable on this device."}
            </span>
          </div>

          <div id="playback-speed" className="space-y-2 scroll-mt-4">
            <p className="text-sm font-medium text-foreground">Speaking rate</p>
            <div className="flex flex-wrap gap-2">
              {SPEECH_RATE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={isPending}
                  onClick={() => saveRate(option)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    speechRate === option
                      ? "bg-accent-cream text-foreground"
                      : "border border-border/70 text-muted hover:bg-accent-cream/50 hover:text-foreground"
                  }`}
                >
                  {formatSpeechRate(option)}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="border-t border-border-soft pt-4 text-xs leading-relaxed text-muted">
          OpenAI narration uses the server API key and billing. Audio is cached
          after generation and labeled as AI-generated voice on note pages.
        </p>
      )}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <SettingsSection title="Read aloud" className="space-y-4">
      {content}
    </SettingsSection>
  );
}
