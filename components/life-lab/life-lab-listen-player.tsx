"use client";

import { useMemo } from "react";

import {
  ReadAloudListenPlayer,
  type ReadAloudSessionStorage,
} from "@/components/read-aloud/read-aloud-listen-player";
import type { LifeLabReadAloudPreferences } from "@/lib/life-lab/read-aloud-preferences";
import type { LifeLabNoteMetadata } from "@/lib/life-lab/constants";
import { buildReadAloudPlaybackPlan } from "@/lib/life-lab/narration-chunks";
import { buildReadAloudSectionsFromNote } from "@/lib/life-lab/narration-text";
import {
  readStoredResumeSectionId,
  readStoredStartSectionId,
  writeStoredResumeSectionId,
  writeStoredStartSectionId,
} from "@/lib/life-lab/read-aloud-session";
import { buildLifeLabSpeechHeaderValues } from "@/lib/life-lab/speech-renderer";
import {
  formatSpeechRate,
  SPEECH_RATE_OPTIONS,
  type SpeechRate,
} from "@/lib/life-lab/speech";

type LifeLabListenPlayerProps = {
  title: string;
  content: string;
  metadata?: LifeLabNoteMetadata;
  expandedSectionTitles?: string[];
  sectionId: string;
  slug: string;
  fileId: string;
  preferences: LifeLabReadAloudPreferences;
  openAiNarrationAvailable: boolean;
  includeFlashcards?: boolean;
  className?: string;
  onSwitchToDevice?: () => void;
};

const lifeLabSessionStorage: ReadAloudSessionStorage = {
  readStoredStartSectionId,
  writeStoredStartSectionId,
  readStoredResumeSectionId,
  writeStoredResumeSectionId,
};

export function LifeLabListenPlayer({
  title,
  content,
  metadata,
  expandedSectionTitles = [],
  sectionId,
  slug,
  fileId,
  preferences,
  openAiNarrationAvailable,
  includeFlashcards = true,
  className = "",
  onSwitchToDevice,
}: LifeLabListenPlayerProps) {
  const playbackPlan = useMemo(() => {
    const sections = buildReadAloudSectionsFromNote({
      title,
      content,
      headerValues: buildLifeLabSpeechHeaderValues(metadata),
      expandedSectionTitles,
      metadata,
      includeFlashcards,
      inclusion: preferences.readAloudSectionInclusion,
    });

    return buildReadAloudPlaybackPlan(sections);
  }, [
    title,
    content,
    includeFlashcards,
    metadata,
    expandedSectionTitles,
    preferences.readAloudSectionInclusion,
  ]);

  return (
    <ReadAloudListenPlayer
      playbackPlan={playbackPlan}
      sessionScopeId={fileId}
      sessionStorage={lifeLabSessionStorage}
      sectionControlId={`read-aloud-section-${fileId}`}
      preferences={preferences}
      openAiNarrationAvailable={openAiNarrationAvailable}
      openAiNarrationOptions={{
        sectionId,
        slug,
        driveFileId: fileId,
        noteTitle: title,
        enabled: false,
        mediaSessionAlbum: "Life Lab",
      }}
      className={className}
      onSwitchToDevice={onSwitchToDevice}
    />
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
