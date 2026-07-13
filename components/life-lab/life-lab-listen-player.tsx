"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
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
import { buildNarrationPlaybackChunks } from "@/lib/life-lab/narration-chunks";
import { READ_ALOUD_PROVIDER_LABELS } from "@/lib/life-lab/narration-config";
import { buildNarrationDocument } from "@/lib/life-lab/narration-text";
import {
  formatSpeechRate,
  isSpeechSynthesisSupported,
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

const PREPARING_CANCEL_DELAY_MS = 4000;

function IconButton({
  children,
  onClick,
  disabled = false,
  active = false,
  ariaLabel,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-border/70 px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 ${
        active ? "border-transparent bg-accent-cream text-foreground" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
}

function ListenPrimaryButton({
  onClick,
  disabled = false,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent-cream/50 disabled:cursor-not-allowed disabled:opacity-60"
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
  const [expanded, setExpanded] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<SpeechRate>(
    preferences.speechRate,
  );
  const [showCancel, setShowCancel] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const provider = preferences.provider;
  const useOpenAi =
    provider === "OPENAI" && openAiNarrationAvailable;

  useEffect(() => {
    setPlaybackRate(preferences.speechRate);
  }, [preferences.speechRate]);

  const playbackChunks = useMemo(() => {
    const sections = buildNarrationDocument({
      title,
      content,
      includeFlashcards,
    });

    return buildNarrationPlaybackChunks(sections);
  }, [title, content, includeFlashcards]);

  const hasText = playbackChunks.length > 0;
  const deviceSupported = isSpeechSynthesisSupported();

  const deviceSpeech = useSpeechSynthesis({
    rate: playbackRate,
    initialVoiceId: preferences.speechVoiceId,
  });

  const openAiNarration = useOpenAiNarration({
    sectionId,
    slug,
    driveFileId: fileId,
    noteTitle: title,
    enabled: useOpenAi,
    playbackRate,
  });

  const isPreparing = useOpenAi && openAiNarration.isPreparing;
  const isReady = useOpenAi && openAiNarration.isReady;
  const isPlaying = useOpenAi
    ? openAiNarration.isPlaying
    : deviceSpeech.isSpeaking;
  const isPaused = useOpenAi
    ? openAiNarration.isPaused
    : deviceSpeech.isPaused;
  const isFinished = useOpenAi
    ? openAiNarration.isFinished
    : deviceSpeech.isFinished;
  const isActive = isPlaying || isPaused;
  const hasError =
    useOpenAi &&
    (openAiNarration.status === "error" ||
      openAiNarration.status === "unavailable");

  const currentSectionLabel = useOpenAi
    ? openAiNarration.sectionLabel
    : playbackChunks[deviceSpeech.currentSequenceIndex]?.sectionLabel ?? null;

  useEffect(() => {
    if (!isPreparing) {
      setShowCancel(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowCancel(true);
    }, PREPARING_CANCEL_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isPreparing]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  const handleStart = useCallback(() => {
    if (useOpenAi) {
      void openAiNarration.play(false);
      return;
    }

    if (deviceSupported) {
      deviceSpeech.speak(playbackChunks.map((chunk) => chunk.text));
    }
  }, [deviceSpeech, deviceSupported, openAiNarration, playbackChunks, useOpenAi]);

  const handleReplay = useCallback(() => {
    if (useOpenAi) {
      openAiNarration.stop();
      void openAiNarration.play(false);
      return;
    }

    deviceSpeech.stop();
    deviceSpeech.speak(playbackChunks.map((chunk) => chunk.text));
  }, [deviceSpeech, openAiNarration, playbackChunks, useOpenAi]);

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

  const cyclePlaybackRate = useCallback(() => {
    setPlaybackRate((current) => {
      const index = SPEECH_RATE_OPTIONS.indexOf(current);
      const next = SPEECH_RATE_OPTIONS[(index + 1) % SPEECH_RATE_OPTIONS.length];
      deviceSpeech.setRate(next);
      return next;
    });
  }, [deviceSpeech]);

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

  const providerLabel = useOpenAi
    ? READ_ALOUD_PROVIDER_LABELS.OPENAI.title
    : READ_ALOUD_PROVIDER_LABELS.DEVICE.title;

  const showNarrationDebug =
    useOpenAi &&
    process.env.NODE_ENV === "development" &&
    (openAiNarration.errorCategory || openAiNarration.debugMessage);

  let primaryAriaLabel = "Start narration";

  if (isPreparing) {
    primaryAriaLabel = "Preparing narration";
  } else if (isPaused) {
    primaryAriaLabel = "Resume narration";
  } else if (isActive) {
    primaryAriaLabel = "Pause narration";
  } else if (isFinished) {
    primaryAriaLabel = "Replay narration";
  }

  return (
    <div className={`space-y-1.5 ${className}`} ref={menuRef}>
      {hasError ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted">
            {openAiNarration.error ?? "OpenAI narration unavailable"}
          </p>
          {onSwitchToDevice ? (
            <button
              type="button"
              onClick={onSwitchToDevice}
              className="rounded-full border border-border/70 px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-accent-cream/50 hover:text-foreground"
            >
              Use device voice
            </button>
          ) : null}
          {openAiNarration.fromCache ? (
            <ListenPrimaryButton
              onClick={() => void openAiNarration.regenerate()}
              ariaLabel="Regenerate narration"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Regenerate
            </ListenPrimaryButton>
          ) : null}
          <ListenPrimaryButton onClick={handleStart} ariaLabel="Retry narration">
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Retry
          </ListenPrimaryButton>
          {showNarrationDebug ? (
            <span className="text-[0.6875rem] text-muted-light">
              {openAiNarration.errorCategory}
              {openAiNarration.debugMessage
                ? ` · ${openAiNarration.debugMessage}`
                : null}
            </span>
          ) : null}
        </div>
      ) : isReady ? (
        <div className="flex flex-wrap items-center gap-2">
          <ListenPrimaryButton
            onClick={() => void openAiNarration.resume()}
            ariaLabel="Play narration"
          >
            <Play className="size-3.5" aria-hidden="true" />
            Tap to play
          </ListenPrimaryButton>
          <p className="text-xs text-muted">
            {openAiNarration.statusMessage ?? "Audio is ready. Tap Play to begin."}
          </p>
          <button
            type="button"
            onClick={() => openAiNarration.cancel()}
            className="rounded-full px-2 py-1 text-xs text-muted transition-colors hover:bg-accent-cream/50 hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      ) : isPreparing ? (
        <div className="flex flex-wrap items-center gap-2">
          <ListenPrimaryButton
            onClick={() => undefined}
            disabled
            ariaLabel="Preparing narration"
          >
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            Preparing audio…
          </ListenPrimaryButton>
          {showCancel ? (
            <button
              type="button"
              onClick={() => openAiNarration.cancel()}
              className="rounded-full px-2 py-1 text-xs text-muted transition-colors hover:bg-accent-cream/50 hover:text-foreground"
            >
              Cancel
            </button>
          ) : null}
          <span className="sr-only" aria-live="polite">
            Preparing narration
          </span>
        </div>
      ) : isFinished ? (
        <ListenPrimaryButton onClick={handleReplay} ariaLabel={primaryAriaLabel}>
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Listen again
        </ListenPrimaryButton>
      ) : isActive ? (
        <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
          <IconButton
            onClick={isPaused ? handleResume : handlePause}
            active
            ariaLabel={isPaused ? "Resume narration" : "Pause narration"}
          >
            {isPaused ? (
              <Play className="size-3.5" aria-hidden="true" />
            ) : (
              <Pause className="size-3.5" aria-hidden="true" />
            )}
          </IconButton>

          {currentSectionLabel ? (
            <span
              className="min-w-0 max-w-[12rem] truncate text-xs text-muted md:max-w-[16rem]"
              title={currentSectionLabel}
            >
              {currentSectionLabel}
            </span>
          ) : null}

          <IconButton
            onClick={cyclePlaybackRate}
            ariaLabel={`Playback speed ${formatSpeechRate(playbackRate)}`}
          >
            {formatSpeechRate(playbackRate)}
          </IconButton>

          <div className="relative">
            <IconButton
              onClick={() => setMenuOpen((open) => !open)}
              ariaLabel="More narration actions"
            >
              <MoreHorizontal className="size-3.5" aria-hidden="true" />
            </IconButton>
            {menuOpen ? (
              <div className="absolute right-0 top-full z-20 mt-1 min-w-[11rem] rounded-xl border border-border/70 bg-surface p-1 shadow-sm">
                <p className="px-2.5 py-1.5 text-[0.6875rem] text-muted-light">
                  {providerLabel}
                </p>
                {useOpenAi ? (
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
                ) : null}
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-muted hover:bg-accent-cream/50 hover:text-foreground"
                  onClick={() => {
                    setMenuOpen(false);
                    handleStop();
                  }}
                >
                  <Square className="size-3.5" aria-hidden="true" />
                  Stop
                </button>
                {useOpenAi ? (
                  <>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-muted hover:bg-accent-cream/50 hover:text-foreground"
                      onClick={() => {
                        setMenuOpen(false);
                        openAiNarration.skipBackward();
                      }}
                    >
                      <SkipBack className="size-3.5" aria-hidden="true" />
                      Back 15 sec
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-muted hover:bg-accent-cream/50 hover:text-foreground"
                      onClick={() => {
                        setMenuOpen(false);
                        openAiNarration.skipForward();
                      }}
                    >
                      <SkipForward className="size-3.5" aria-hidden="true" />
                      Forward 15 sec
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-muted hover:bg-accent-cream/50 hover:text-foreground"
                      onClick={() => {
                        setMenuOpen(false);
                        void openAiNarration.nextSection();
                      }}
                    >
                      Next section
                    </button>
                  </>
                ) : null}
                <Link
                  href="/settings"
                  className="block rounded-lg px-2.5 py-2 text-xs text-muted hover:bg-accent-cream/50 hover:text-foreground"
                  onClick={() => setMenuOpen(false)}
                >
                  Narration settings
                </Link>
              </div>
            ) : null}
          </div>

          {expanded && useOpenAi && openAiNarration.chunkCount > 0 ? (
            <span className="w-full text-[0.6875rem] text-muted-light md:w-auto">
              Section {openAiNarration.currentChunkIndex + 1} of{" "}
              {openAiNarration.chunkCount}
            </span>
          ) : null}

          {useOpenAi && openAiNarration.chunkCount > 1 ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="text-[0.6875rem] text-muted-light underline-offset-2 hover:underline"
            >
              {expanded ? "Less" : "Expand"}
            </button>
          ) : null}
        </div>
      ) : (
        <ListenPrimaryButton onClick={handleStart} ariaLabel={primaryAriaLabel}>
          <Play className="size-3.5" aria-hidden="true" />
          Listen
        </ListenPrimaryButton>
      )}

      {!useOpenAi && deviceSpeech.voiceUnavailableNotice ? (
        <p className="text-xs text-muted">{deviceSpeech.voiceUnavailableNotice}</p>
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
