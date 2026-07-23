"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
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
import type { ReadAloudPlaybackPlan } from "@/lib/life-lab/narration-chunks";
import { READ_ALOUD_PROVIDER_LABELS } from "@/lib/life-lab/narration-config";
import { findReadAloudSectionIndex } from "@/lib/life-lab/read-aloud-sections";
import {
  formatSpeechRate,
  isSpeechSynthesisSupported,
  SPEECH_RATE_OPTIONS,
  type SpeechRate,
} from "@/lib/life-lab/speech";

export type ReadAloudSessionStorage = {
  readStoredStartSectionId: (scopeId: string) => string | null;
  writeStoredStartSectionId: (scopeId: string, sectionId: string) => void;
  writeStoredResumeSectionId: (scopeId: string, sectionId: string) => void;
  readStoredResumeSectionId: (scopeId: string) => string | null;
};

type ReadAloudListenPlayerProps = {
  playbackPlan: ReadAloudPlaybackPlan;
  sessionScopeId: string;
  sessionStorage: ReadAloudSessionStorage;
  sectionControlId: string;
  preferences: LifeLabReadAloudPreferences;
  openAiNarrationAvailable: boolean;
  openAiNarrationOptions: Parameters<typeof useOpenAiNarration>[0];
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

function resolveDefaultStartSectionId(
  sessionStorage: ReadAloudSessionStorage,
  sessionScopeId: string,
  sectionIds: string[],
): string {
  if (sectionIds.length === 0) {
    return "";
  }

  const storedStart = sessionStorage.readStoredStartSectionId(sessionScopeId);

  if (storedStart && sectionIds.includes(storedStart)) {
    return storedStart;
  }

  const storedResume = sessionStorage.readStoredResumeSectionId(sessionScopeId);

  if (storedResume && sectionIds.includes(storedResume)) {
    return storedResume;
  }

  return sectionIds[0] ?? "";
}

export function ReadAloudListenPlayer({
  playbackPlan,
  sessionScopeId,
  sessionStorage,
  sectionControlId,
  preferences,
  openAiNarrationAvailable,
  openAiNarrationOptions,
  className = "",
  onSwitchToDevice,
}: ReadAloudListenPlayerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<SpeechRate>(
    preferences.speechRate,
  );
  const [showCancel, setShowCancel] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const sectionMenuRef = useRef<HTMLDivElement>(null);
  const provider = preferences.provider;
  const useOpenAi = provider === "OPENAI" && openAiNarrationAvailable;
  const autoContinue = preferences.readAloudAutoContinue;

  useEffect(() => {
    setPlaybackRate(preferences.speechRate);
  }, [preferences.speechRate]);

  const playbackPlanValue = playbackPlan;
  const readableSections = playbackPlanValue.sections;
  const sectionCount = readableSections.length;
  const defaultStartSectionId = useMemo(
    () =>
      resolveDefaultStartSectionId(
        sessionStorage,
        sessionScopeId,
        readableSections.map((section) => section.id),
      ),
    [readableSections, sessionScopeId, sessionStorage],
  );
  const [startSectionId, setStartSectionId] = useState(defaultStartSectionId);

  useEffect(() => {
    setStartSectionId(defaultStartSectionId);
  }, [defaultStartSectionId]);

  const handleSectionChange = useCallback(
    (sectionIdValue: string | null) => {
      if (sectionIdValue) {
        sessionStorage.writeStoredResumeSectionId(sessionScopeId, sectionIdValue);
      }
    },
    [sessionScopeId, sessionStorage],
  );

  const deviceSpeech = useSpeechSynthesis({
    rate: playbackRate,
    initialVoiceId: preferences.speechVoiceId,
    autoContinue,
    onSectionChange: handleSectionChange,
  });

  const openAiNarration = useOpenAiNarration({
    ...openAiNarrationOptions,
    enabled: useOpenAi,
    playbackRate,
    autoContinue,
    onSectionChange: handleSectionChange,
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
  const awaitingSectionContinue = !useOpenAi && deviceSpeech.awaitingSectionContinue;
  const isActive = isPlaying || isPaused || awaitingSectionContinue;
  const hasError =
    useOpenAi &&
    (openAiNarration.status === "error" ||
      openAiNarration.status === "unavailable");

  const currentSectionIndex = useOpenAi
    ? openAiNarration.currentSectionIndex
    : deviceSpeech.currentSectionIndex;
  const currentSectionTitle =
    readableSections[currentSectionIndex]?.title ??
    readableSections[findReadAloudSectionIndex(readableSections, startSectionId)]
      ?.title ??
    null;

  const canGoPrevious = currentSectionIndex > 0;
  const canGoNext = currentSectionIndex < sectionCount - 1;

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
    if (!menuOpen && !sectionMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (
        !menuRef.current?.contains(target) &&
        !sectionMenuRef.current?.contains(target)
      ) {
        setMenuOpen(false);
        setSectionMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen, sectionMenuOpen]);

  const beginPlayback = useCallback(
    (options?: { startSectionId?: string; playOnlySection?: boolean }) => {
      const resolvedStartSectionId =
        options?.startSectionId ?? startSectionId ?? readableSections[0]?.id ?? "";

      if (resolvedStartSectionId) {
        sessionStorage.writeStoredStartSectionId(
          sessionScopeId,
          resolvedStartSectionId,
        );
      }

      if (useOpenAi) {
        void openAiNarration.play(false, {
          startSectionId: resolvedStartSectionId,
          playOnlySection: options?.playOnlySection ?? false,
        });
        return;
      }

      if (isSpeechSynthesisSupported()) {
        deviceSpeech.speakPlan(playbackPlanValue, {
          startSectionId: resolvedStartSectionId,
          playOnlySection: options?.playOnlySection ?? false,
          autoContinue,
        });
      }
    },
    [
      autoContinue,
      deviceSpeech,
      openAiNarration,
      playbackPlanValue,
      readableSections,
      sessionScopeId,
      sessionStorage,
      startSectionId,
      useOpenAi,
    ],
  );

  const handleStart = useCallback(() => {
    beginPlayback();
  }, [beginPlayback]);

  const handleReplay = useCallback(() => {
    if (useOpenAi) {
      openAiNarration.stop();
      beginPlayback();
      return;
    }

    deviceSpeech.stop();
    beginPlayback();
  }, [beginPlayback, deviceSpeech, openAiNarration, useOpenAi]);

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

  const handlePreviousSection = useCallback(() => {
    if (useOpenAi) {
      void openAiNarration.previousSection();
      return;
    }

    deviceSpeech.previousSection();
  }, [deviceSpeech, openAiNarration, useOpenAi]);

  const handleNextSection = useCallback(() => {
    if (useOpenAi) {
      void openAiNarration.nextSection();
      return;
    }

    deviceSpeech.nextSection();
  }, [deviceSpeech, openAiNarration, useOpenAi]);

  const handleJumpToSection = useCallback(
    (sectionIdValue: string, playOnlySection: boolean) => {
      setSectionMenuOpen(false);
      setStartSectionId(sectionIdValue);
      sessionStorage.writeStoredStartSectionId(sessionScopeId, sectionIdValue);

      if (isActive) {
        if (useOpenAi) {
          void openAiNarration.jumpToSection(sectionIdValue, playOnlySection);
        } else {
          deviceSpeech.jumpToSection(sectionIdValue, playOnlySection);
        }
        return;
      }

      beginPlayback({
        startSectionId: sectionIdValue,
        playOnlySection,
      });
    },
    [
      beginPlayback,
      deviceSpeech,
      isActive,
      openAiNarration,
      sessionScopeId,
      sessionStorage,
      useOpenAi,
    ],
  );

  const cyclePlaybackRate = useCallback(() => {
    setPlaybackRate((current) => {
      const index = SPEECH_RATE_OPTIONS.indexOf(current);
      const next = SPEECH_RATE_OPTIONS[(index + 1) % SPEECH_RATE_OPTIONS.length];
      deviceSpeech.setRate(next);
      return next;
    });
  }, [deviceSpeech]);

  if (sectionCount === 0) {
    return null;
  }

  if (!isSpeechSynthesisSupported() && !openAiNarrationAvailable) {
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
  } else if (isPaused || awaitingSectionContinue) {
    primaryAriaLabel = "Resume narration";
  } else if (isActive) {
    primaryAriaLabel = "Pause narration";
  } else if (isFinished) {
    primaryAriaLabel = "Replay narration";
  }

  const progressCountLabel =
    sectionCount > 1 ? `${currentSectionIndex + 1} of ${sectionCount}` : null;

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
            onClick={
              isPaused || awaitingSectionContinue ? handleResume : handlePause
            }
            active
            ariaLabel={
              isPaused || awaitingSectionContinue
                ? "Resume narration"
                : "Pause narration"
            }
          >
            {isPaused || awaitingSectionContinue ? (
              <Play className="size-3.5" aria-hidden="true" />
            ) : (
              <Pause className="size-3.5" aria-hidden="true" />
            )}
          </IconButton>

          {currentSectionTitle ? (
            <span
              className="min-w-0 max-w-[10rem] truncate text-xs text-muted md:max-w-[12rem]"
              title={currentSectionTitle}
            >
              {currentSectionTitle}
            </span>
          ) : null}

          {progressCountLabel ? (
            <span className="text-[0.6875rem] text-muted-light">{progressCountLabel}</span>
          ) : null}

          {sectionCount > 1 ? (
            <>
              <IconButton
                onClick={() => void handlePreviousSection()}
                disabled={!canGoPrevious}
                ariaLabel="Previous narration section"
              >
                <ChevronLeft className="size-3.5" aria-hidden="true" />
              </IconButton>
              <IconButton
                onClick={() => void handleNextSection()}
                disabled={!canGoNext}
                ariaLabel="Next narration section"
              >
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </IconButton>
            </>
          ) : null}

          {sectionCount > 1 ? (
            <div className="relative" ref={sectionMenuRef}>
              <label className="sr-only" htmlFor={sectionControlId}>
                Section
              </label>
              <select
                id={sectionControlId}
                value={readableSections[currentSectionIndex]?.id ?? startSectionId}
                onChange={(event) => {
                  handleJumpToSection(event.target.value, false);
                }}
                className="max-w-[9rem] rounded-full border border-border/70 bg-transparent px-2 py-1 text-xs text-muted"
              >
                {readableSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title}
                  </option>
                ))}
              </select>
            </div>
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
                {sectionCount > 1
                  ? readableSections.map((section) => (
                      <div key={section.id} className="border-t border-border-soft/70">
                        <button
                          type="button"
                          className="flex w-full items-center rounded-lg px-2.5 py-2 text-left text-xs text-muted hover:bg-accent-cream/50 hover:text-foreground"
                          onClick={() =>
                            handleJumpToSection(section.id, false)
                          }
                        >
                          Play from {section.title}
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center rounded-lg px-2.5 py-2 text-left text-xs text-muted hover:bg-accent-cream/50 hover:text-foreground"
                          onClick={() => handleJumpToSection(section.id, true)}
                        >
                          Play only {section.title}
                        </button>
                      </div>
                    ))
                  : null}
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
                  </>
                ) : null}
                <Link
                  href="/settings/voice-audio"
                  className="block rounded-lg px-2.5 py-2 text-xs text-muted hover:bg-accent-cream/50 hover:text-foreground"
                  onClick={() => setMenuOpen(false)}
                >
                  Narration settings
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <ListenPrimaryButton onClick={handleStart} ariaLabel={primaryAriaLabel}>
            <Play className="size-3.5" aria-hidden="true" />
            Listen
          </ListenPrimaryButton>
          {sectionCount > 1 ? (
            <div className="relative" ref={sectionMenuRef}>
              <IconButton
                onClick={() => setSectionMenuOpen((open) => !open)}
                ariaLabel="Choose starting section"
                active={sectionMenuOpen}
              >
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </IconButton>
              {sectionMenuOpen ? (
                <div
                  className="absolute left-0 top-full z-20 mt-1 max-h-64 min-w-[12rem] overflow-y-auto rounded-xl border border-border/70 bg-surface p-1 shadow-sm"
                  data-life-lab-start-section-menu=""
                >
                  <p className="px-2.5 py-1.5 text-[0.6875rem] text-muted-light">
                    Start from
                  </p>
                  {readableSections.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      className={`flex w-full items-center rounded-lg px-2.5 py-2 text-left text-xs hover:bg-accent-cream/50 hover:text-foreground ${
                        section.id === startSectionId
                          ? "bg-accent-cream/40 text-foreground"
                          : "text-muted"
                      }`}
                      onClick={() => {
                        setStartSectionId(section.id);
                        sessionStorage.writeStoredStartSectionId(
                          sessionScopeId,
                          section.id,
                        );
                        setSectionMenuOpen(false);
                      }}
                    >
                      {section.title}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
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
