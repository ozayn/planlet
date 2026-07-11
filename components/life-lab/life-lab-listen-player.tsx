"use client";

import { useCallback, useMemo, useState } from "react";
import {
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Square,
} from "lucide-react";

import { useOpenAiNarration } from "@/components/life-lab/use-openai-narration";
import { useSpeechSynthesis } from "@/components/life-lab/use-speech-synthesis";
import type { LifeLabReadAloudPreferences } from "@/lib/life-lab/read-aloud-preferences";
import {
  formatSpeechRate,
  isSpeechSynthesisSupported,
  prepareNoteSpeechChunks,
  SPEECH_RATE_OPTIONS,
  type SpeechRate,
} from "@/lib/life-lab/speech";

type LifeLabListenPlayerProps = {
  title: string;
  content: string;
  sectionId: string;
  slug: string;
  fileId: string;
  preferences: LifeLabReadAloudPreferences;
  openAiNarrationAvailable: boolean;
  includeFlashcards?: boolean;
  className?: string;
  onSwitchToDevice?: () => void;
};

function ControlButton({
  children,
  onClick,
  disabled = false,
  active = false,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-accent-cream text-foreground"
          : "border border-border/70 text-muted hover:bg-accent-cream/50 hover:text-foreground"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
    </button>
  );
}

export function LifeLabListenPlayer({
  title,
  content,
  sectionId,
  slug,
  fileId,
  preferences,
  openAiNarrationAvailable,
  includeFlashcards = true,
  className = "",
  onSwitchToDevice,
}: LifeLabListenPlayerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const provider = preferences.provider;
  const useOpenAi =
    provider === "OPENAI" && openAiNarrationAvailable;

  const speechChunks = useMemo(
    () =>
      prepareNoteSpeechChunks(title, content, {
        includeFlashcards,
      }),
    [title, content, includeFlashcards],
  );

  const deviceSpeech = useSpeechSynthesis({
    rate: preferences.speechRate,
    initialVoiceId: preferences.speechVoiceId,
  });

  const openAiNarration = useOpenAiNarration({
    sectionId,
    slug,
    driveFileId: fileId,
    noteTitle: title,
    enabled: useOpenAi,
    playbackRate: preferences.speechRate,
  });

  const hasText = speechChunks.length > 0;
  const deviceSupported = isSpeechSynthesisSupported();

  const handlePlay = useCallback(() => {
    if (useOpenAi) {
      void openAiNarration.play(false);
      return;
    }

    if (deviceSupported) {
      deviceSpeech.speak(speechChunks);
    }
  }, [deviceSpeech, deviceSupported, openAiNarration, speechChunks, useOpenAi]);

  const handleStop = useCallback(() => {
    if (useOpenAi) {
      openAiNarration.stop();
      return;
    }

    deviceSpeech.stop();
  }, [deviceSpeech, openAiNarration, useOpenAi]);

  const handlePause = useCallback(() => {
    if (useOpenAi) {
      openAiNarration.pause();
      return;
    }

    deviceSpeech.pause();
  }, [deviceSpeech, openAiNarration, useOpenAi]);

  const handleResume = useCallback(() => {
    if (useOpenAi) {
      openAiNarration.resume();
      return;
    }

    deviceSpeech.resume();
  }, [deviceSpeech, openAiNarration, useOpenAi]);

  if (!hasText) {
    return null;
  }

  if (!deviceSupported && !openAiNarrationAvailable) {
    return (
      <p className={`text-xs text-muted ${className}`}>
        Narration unavailable in this browser.
      </p>
    );
  }

  const isPlaying = useOpenAi
    ? openAiNarration.isPlaying
    : deviceSpeech.isSpeaking;
  const isPaused = useOpenAi
    ? openAiNarration.isPaused
    : deviceSpeech.isPaused;
  const statusMessage = useOpenAi
    ? openAiNarration.statusMessage
    : isPlaying
      ? "Playing device voice"
      : null;
  const sectionLabel = useOpenAi ? openAiNarration.sectionLabel : null;
  const showOpenAiFallback =
    useOpenAi &&
    (openAiNarration.status === "error" ||
      openAiNarration.status === "unavailable");

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted">Listen</span>

        {!isPlaying && !isPaused ? (
          <ControlButton onClick={handlePlay} ariaLabel="Play narration">
            <span className="inline-flex items-center gap-1">
              <Play className="size-3.5" aria-hidden="true" />
              Play
            </span>
          </ControlButton>
        ) : (
          <>
            <ControlButton onClick={handleStop} active ariaLabel="Stop narration">
              <span className="inline-flex items-center gap-1">
                <Square className="size-3.5" aria-hidden="true" />
                Stop
              </span>
            </ControlButton>
            {isPaused ? (
              <ControlButton onClick={handleResume} ariaLabel="Resume narration">
                <span className="inline-flex items-center gap-1">
                  <Play className="size-3.5" aria-hidden="true" />
                  Resume
                </span>
              </ControlButton>
            ) : (
              <ControlButton onClick={handlePause} ariaLabel="Pause narration">
                <span className="inline-flex items-center gap-1">
                  <Pause className="size-3.5" aria-hidden="true" />
                  Pause
                </span>
              </ControlButton>
            )}
          </>
        )}

        {useOpenAi && isPlaying ? (
          <>
            <ControlButton
              onClick={openAiNarration.skipBackward}
              ariaLabel="Skip backward 15 seconds"
            >
              <SkipBack className="size-3.5" aria-hidden="true" />
            </ControlButton>
            <ControlButton
              onClick={openAiNarration.skipForward}
              ariaLabel="Skip forward 15 seconds"
            >
              <SkipForward className="size-3.5" aria-hidden="true" />
            </ControlButton>
            <ControlButton
              onClick={() => void openAiNarration.nextSection()}
              ariaLabel="Next section"
            >
              Next
            </ControlButton>
          </>
        ) : null}

        {!useOpenAi ? (
          <span className="text-xs text-muted">
            {formatSpeechRate(deviceSpeech.rate)}
          </span>
        ) : null}

        {useOpenAi ? (
          <div className="relative">
            <ControlButton
              onClick={() => setMenuOpen((open) => !open)}
              ariaLabel="More narration actions"
            >
              <MoreHorizontal className="size-3.5" aria-hidden="true" />
            </ControlButton>
            {menuOpen ? (
              <div className="absolute right-0 top-full z-20 mt-1 min-w-[10rem] rounded-xl border border-border/70 bg-surface p-1 shadow-sm">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-muted hover:bg-accent-cream/50 hover:text-foreground"
                  onClick={() => {
                    setMenuOpen(false);
                    void openAiNarration.regenerate();
                  }}
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  Regenerate narration
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {statusMessage ? (
        <p className="text-xs text-muted-light" aria-live="polite">
          {statusMessage}
          {sectionLabel ? ` · ${sectionLabel}` : ""}
        </p>
      ) : null}

      {useOpenAi ? (
        <p className="text-[0.6875rem] text-muted-light">AI-generated voice</p>
      ) : null}

      {showOpenAiFallback ? (
        <div className="space-y-2">
          <p className="text-xs text-muted">
            {openAiNarration.switchToDeviceMessage}
          </p>
          {onSwitchToDevice ? (
            <button
              type="button"
              onClick={onSwitchToDevice}
              className="rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream/50 hover:text-foreground"
            >
              Use device voice
            </button>
          ) : null}
        </div>
      ) : null}

      {!useOpenAi && deviceSpeech.voiceUnavailableNotice ? (
        <p className="text-xs text-muted">
          {deviceSpeech.voiceUnavailableNotice}
        </p>
      ) : null}

      {!useOpenAi && deviceSpeech.playbackFailed ? (
        <p className="text-xs text-muted">
          Read aloud may not work in this browser. Try Safari on macOS, or switch
          to OpenAI narration in Settings.
        </p>
      ) : null}
    </div>
  );
}

export function LifeLabListenRateControls({
  rate,
  onRateChange,
  disabled = false,
}: {
  rate: SpeechRate;
  onRateChange: (rate: SpeechRate) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {SPEECH_RATE_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          onClick={() => onRateChange(option)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            rate === option
              ? "bg-accent-cream text-foreground"
              : "border border-border/70 text-muted hover:bg-accent-cream/50 hover:text-foreground"
          }`}
        >
          {formatSpeechRate(option)}
        </button>
      ))}
    </div>
  );
}
