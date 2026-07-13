"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  updateLifeLabCustomNarrationInstructionsAction,
  updateLifeLabOpenAiNarrationStyleAction,
  updateLifeLabOpenAiTtsVoiceAction,
  updateLifeLabReadAloudAutoContinueAction,
  updateLifeLabReadAloudProviderAction,
  updateLifeLabReadAloudSectionInclusionAction,
  updateLifeLabSpeechRateAction,
  updateLifeLabSpeechVoiceAction,
} from "@/app/(app)/settings/actions";
import { SettingsSection } from "@/components/settings/settings-section";
import type { LifeLabReadAloudPreferences } from "@/lib/life-lab/read-aloud-preferences";
import type { ReadAloudSectionInclusionPrefs } from "@/lib/life-lab/read-aloud-sections";
import {
  NARRATION_PREVIEW_TEXT,
  OPENAI_NARRATION_STYLES,
  OPENAI_NARRATION_STYLE_IDS,
  OPENAI_NARRATION_VOICES,
  READ_ALOUD_PROVIDER_LABELS,
  type OpenAiNarrationStyleId,
} from "@/lib/life-lab/narration-config";
import {
  createNarrationObjectUrl,
  replaceAudioObjectUrl,
} from "@/lib/life-lab/narration-playback";
import {
  formatOpenAiNarrationStyleLabel,
  formatOpenAiNarrationVoiceLabel,
} from "@/lib/life-lab/openai-narration-preferences";
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

const DEVICE_VOICE_PREVIEW_TEXT =
  "Hi, this is a preview of your selected reading voice.";

const READ_ALOUD_SECTION_TOGGLES: Array<{
  key: keyof ReadAloudSectionInclusionPrefs;
  label: string;
  group: "default" | "optional";
}> = [
  { key: "shortVersion", label: "Short version", group: "default" },
  { key: "summary", label: "Summary", group: "default" },
  { key: "coreArgument", label: "Core argument", group: "default" },
  { key: "keyIdeas", label: "Key ideas", group: "default" },
  { key: "mainLessons", label: "Main lessons", group: "default" },
  { key: "whatToRemember", label: "What to remember", group: "default" },
  { key: "peopleConcepts", label: "People / concepts", group: "optional" },
  { key: "timeline", label: "Timeline", group: "optional" },
  { key: "questions", label: "Questions", group: "optional" },
  { key: "flashcards", label: "Flashcards", group: "optional" },
  { key: "fullTranscript", label: "Full transcript", group: "optional" },
];

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
  const [openAiVoice, setOpenAiVoice] = useState(preferences.openAiTtsVoice);
  const [openAiStyle, setOpenAiStyle] = useState<OpenAiNarrationStyleId>(
    preferences.openAiNarrationStyle,
  );
  const [customInstructions, setCustomInstructions] = useState(
    preferences.customNarrationInstructions ?? "",
  );
  const [autoContinue, setAutoContinue] = useState(preferences.readAloudAutoContinue);
  const [sectionInclusion, setSectionInclusion] = useState(
    preferences.readAloudSectionInclusion,
  );
  const [deviceVoices, setDeviceVoices] = useState<
    ReturnType<typeof listAllDeviceSpeechVoices>
  >([]);
  const [rawVoices, setRawVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openAiVoiceWarning, setOpenAiVoiceWarning] = useState<string | null>(null);
  const [previewStatus, setPreviewStatus] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setProvider(preferences.provider);
    setSpeechVoiceId(preferences.speechVoiceId);
    setSpeechRate(preferences.speechRate);
    setOpenAiVoice(preferences.openAiTtsVoice);
    setOpenAiStyle(preferences.openAiNarrationStyle);
    setCustomInstructions(preferences.customNarrationInstructions ?? "");
    setAutoContinue(preferences.readAloudAutoContinue);
    setSectionInclusion(preferences.readAloudSectionInclusion);
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

  useEffect(() => () => {
    previewAudioRef.current?.pause();
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
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

  function saveOpenAiVoice(nextVoice: string) {
    if (nextVoice === openAiVoice || isPending) {
      return;
    }

    setOpenAiVoice(nextVoice);
    setError(null);
    setOpenAiVoiceWarning(null);

    startTransition(async () => {
      const result = await updateLifeLabOpenAiTtsVoiceAction(nextVoice);

      if (!result.success) {
        setOpenAiVoice(openAiVoice);
        setError(result.error ?? "Couldn't save OpenAI voice.");
        return;
      }

      router.refresh();
    });
  }

  function saveOpenAiStyle(nextStyle: OpenAiNarrationStyleId) {
    if (nextStyle === openAiStyle || isPending) {
      return;
    }

    setOpenAiStyle(nextStyle);
    setError(null);

    startTransition(async () => {
      const result = await updateLifeLabOpenAiNarrationStyleAction(nextStyle);

      if (!result.success) {
        setOpenAiStyle(openAiStyle);
        setError(result.error ?? "Couldn't save narration style.");
        return;
      }

      router.refresh();
    });
  }

  function saveCustomInstructions(nextInstructions: string) {
    if (nextInstructions === (preferences.customNarrationInstructions ?? "") || isPending) {
      return;
    }

    setCustomInstructions(nextInstructions);
    setError(null);

    startTransition(async () => {
      const result = await updateLifeLabCustomNarrationInstructionsAction(nextInstructions);

      if (!result.success) {
        setCustomInstructions(preferences.customNarrationInstructions ?? "");
        setError(result.error ?? "Couldn't save custom instructions.");
        return;
      }

      router.refresh();
    });
  }

  function saveAutoContinue(nextValue: boolean) {
    if (nextValue === autoContinue || isPending) {
      return;
    }

    setAutoContinue(nextValue);
    setError(null);

    startTransition(async () => {
      const result = await updateLifeLabReadAloudAutoContinueAction(nextValue);

      if (!result.success) {
        setAutoContinue(autoContinue);
        setError(result.error ?? "Couldn't save continue automatically setting.");
        return;
      }

      router.refresh();
    });
  }

  function saveSectionInclusion(
    key: keyof ReadAloudSectionInclusionPrefs,
    enabled: boolean,
  ) {
    if (sectionInclusion[key] === enabled || isPending) {
      return;
    }

    const nextInclusion = { ...sectionInclusion, [key]: enabled };
    setSectionInclusion(nextInclusion);
    setError(null);

    startTransition(async () => {
      const result = await updateLifeLabReadAloudSectionInclusionAction(nextInclusion);

      if (!result.success) {
        setSectionInclusion(sectionInclusion);
        setError(result.error ?? "Couldn't save read aloud sections.");
        return;
      }

      router.refresh();
    });
  }

  const resolved = resolveDeviceVoiceWithFallback(rawVoices, speechVoiceId);
  const isAutoVoice = speechVoiceId === SPEECH_AUTO_VOICE_ID;
  const selectValue = isAutoVoice
    ? SPEECH_AUTO_VOICE_ID
    : resolved.voice
      ? encodeDeviceVoiceId(resolved.voice)
      : speechVoiceId;
  const selectedVoiceLabel = resolved.voice
    ? formatSpeechVoiceLabel(resolved.voice)
    : null;

  function previewDeviceVoice() {
    if (!isSpeechSynthesisSupported()) {
      return;
    }

    void loadSpeechSynthesisVoices().then((voices) => {
      const { voice } = resolveDeviceVoiceWithFallback(voices, speechVoiceId);
      const utterance = createSpeechUtterance(DEVICE_VOICE_PREVIEW_TEXT, {
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

  async function previewOpenAiNarration() {
    if (!openAiNarrationAvailable || isPreviewing) {
      return;
    }

    setPreviewStatus("Generating preview…");
    setOpenAiVoiceWarning(null);
    setIsPreviewing(true);

    try {
      const response = await fetch("/api/life-lab/narration/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voice: openAiVoice,
          narrationStyle: openAiStyle,
          customNarrationInstructions:
            openAiStyle === "CUSTOM" ? customInstructions : null,
        }),
      });

      const voiceWarning = response.headers.get("X-Narration-Voice-Warning");

      if (voiceWarning) {
        setOpenAiVoiceWarning(decodeURIComponent(voiceWarning));
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setPreviewStatus(payload?.error ?? "Preview failed.");
        return;
      }

      const blob = await response.blob();
      const objectUrl = createNarrationObjectUrl(blob);

      if (!previewAudioRef.current) {
        previewAudioRef.current = new Audio();
      }

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      previewUrlRef.current = objectUrl;
      replaceAudioObjectUrl({
        audio: previewAudioRef.current,
        nextUrl: objectUrl,
        activeUrlRef: previewUrlRef,
      });

      await previewAudioRef.current.play();

      const styleLabel = decodeURIComponent(
        response.headers.get("X-Narration-Style-Label") ??
          formatOpenAiNarrationStyleLabel(openAiStyle),
      );
      const voiceLabel = decodeURIComponent(
        response.headers.get("X-Narration-Voice-Label") ??
          formatOpenAiNarrationVoiceLabel(openAiVoice),
      );

      setPreviewStatus(`Previewing ${styleLabel} · ${voiceLabel}`);
    } catch {
      setPreviewStatus("Preview failed.");
    } finally {
      setIsPreviewing(false);
    }
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
              onClick={previewDeviceVoice}
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
        <div
          id="openai-narration"
          className="space-y-4 border-t border-border-soft pt-4 scroll-mt-4"
        >
          <p className="text-xs leading-relaxed text-muted">
            OpenAI narration uses the server API key and billing. Audio is cached
            after generation and labeled as AI-generated voice on note pages.
          </p>

          <fieldset id="openai-narration-style" className="space-y-2">
            <legend className="text-sm font-medium text-foreground">
              Narration style
            </legend>
            <div className="space-y-2">
              {OPENAI_NARRATION_STYLE_IDS.map((styleId) => (
                <label
                  key={styleId}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors ${
                    openAiStyle === styleId
                      ? "border-border bg-accent-cream/30"
                      : "border-border/70"
                  }`}
                >
                  <input
                    type="radio"
                    name="openai-narration-style"
                    value={styleId}
                    checked={openAiStyle === styleId}
                    disabled={isPending}
                    onChange={() => saveOpenAiStyle(styleId)}
                    className="mt-1"
                  />
                  <span className="text-sm text-foreground">
                    {OPENAI_NARRATION_STYLES[styleId].label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {openAiStyle === "CUSTOM" ? (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Custom instructions</span>
              <textarea
                value={customInstructions}
                disabled={isPending}
                onChange={(event) => setCustomInstructions(event.target.value)}
                onBlur={() => saveCustomInstructions(customInstructions)}
                rows={4}
                className="rounded-xl border border-border/70 bg-transparent px-3 py-2 text-sm text-foreground"
                placeholder="Describe how OpenAI should read your notes."
              />
            </label>
          ) : null}

          <label
            id="openai-voice"
            className="flex flex-col gap-1.5 text-sm scroll-mt-4"
          >
            <span className="font-medium text-foreground">OpenAI voice</span>
            <select
              value={openAiVoice}
              disabled={isPending}
              onChange={(event) => saveOpenAiVoice(event.target.value)}
              className="rounded-xl border border-border/70 bg-transparent px-3 py-2 text-sm text-foreground"
            >
              {OPENAI_NARRATION_VOICES.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.label}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => void previewOpenAiNarration()}
              disabled={isPending || isPreviewing}
              className="rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPreviewing ? "Generating preview…" : "Preview"}
            </button>
            <p className="text-xs leading-relaxed text-muted">
              {NARRATION_PREVIEW_TEXT}
            </p>
            {previewStatus ? (
              <p className="text-xs text-muted-light">{previewStatus}</p>
            ) : null}
            {openAiVoiceWarning ? (
              <p className="text-xs text-red-600">{openAiVoiceWarning}</p>
            ) : null}
          </div>
        </div>
      )}

      <div
        id="read-aloud-continue"
        className="space-y-3 border-t border-border-soft pt-4 scroll-mt-4"
      >
        <p className="text-sm font-medium text-foreground">Continue automatically</p>
        <p className="text-xs leading-relaxed text-muted">
          When on, narration moves to the next included section after each one
          finishes. When off, playback stops after the current section.
        </p>
        <div className="flex flex-wrap gap-2">
          {([true, false] as const).map((value) => (
            <button
              key={value ? "on" : "off"}
              type="button"
              disabled={isPending}
              onClick={() => saveAutoContinue(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                autoContinue === value
                  ? "bg-accent-cream text-foreground"
                  : "border border-border/70 text-muted hover:bg-accent-cream/50 hover:text-foreground"
              }`}
            >
              {value ? "On" : "Off"}
            </button>
          ))}
        </div>
      </div>

      <div
        id="read-aloud-sections"
        className="space-y-4 border-t border-border-soft pt-4 scroll-mt-4"
      >
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Read aloud sections</p>
          <p className="text-xs leading-relaxed text-muted">
            Choose which note sections are included in narration. Technical
            details, source notes, and hidden content are always excluded.
          </p>
        </div>

        {(["default", "optional"] as const).map((group) => (
          <div key={group} className="space-y-2">
            <p className="text-xs font-medium text-muted">
              {group === "default" ? "Included by default" : "Optional"}
            </p>
            <div className="space-y-2">
              {READ_ALOUD_SECTION_TOGGLES.filter((entry) => entry.group === group).map(
                (entry) => (
                  <label
                    key={entry.key}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 px-3 py-2.5"
                  >
                    <input
                      type="checkbox"
                      checked={sectionInclusion[entry.key]}
                      disabled={isPending}
                      onChange={(event) =>
                        saveSectionInclusion(entry.key, event.target.checked)
                      }
                    />
                    <span className="text-sm text-foreground">{entry.label}</span>
                  </label>
                ),
              )}
            </div>
          </div>
        ))}
      </div>

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
