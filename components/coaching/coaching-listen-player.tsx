"use client";

import { useMemo } from "react";

import {
  ReadAloudListenPlayer,
  type ReadAloudSessionStorage,
} from "@/components/read-aloud/read-aloud-listen-player";
import type { CoachingReadAloudContent } from "@/lib/coaching/read-aloud-sections";
import { buildCoachingReadAloudPlaybackPlan } from "@/lib/coaching/read-aloud-sections";
import {
  readStoredResumeSectionId,
  readStoredStartSectionId,
  writeStoredResumeSectionId,
  writeStoredStartSectionId,
} from "@/lib/coaching/read-aloud-session";

type CoachingListenPlayerProps = {
  content: CoachingReadAloudContent;
  preferences: import("@/lib/life-lab/read-aloud-preferences").LifeLabReadAloudPreferences;
  openAiNarrationAvailable: boolean;
  className?: string;
  onSwitchToDevice?: () => void;
};

const coachingSessionStorage: ReadAloudSessionStorage = {
  readStoredStartSectionId,
  writeStoredStartSectionId,
  readStoredResumeSectionId,
  writeStoredResumeSectionId,
};

function buildCoachingSessionScopeId(content: CoachingReadAloudContent): string {
  return [
    content.reflection,
    content.question ?? "",
    content.experiment ?? "",
  ].join("\u001f");
}

export function CoachingListenPlayer({
  content,
  preferences,
  openAiNarrationAvailable,
  className = "",
  onSwitchToDevice,
}: CoachingListenPlayerProps) {
  const playbackPlan = useMemo(
    () => buildCoachingReadAloudPlaybackPlan(content),
    [content],
  );
  const sessionScopeId = useMemo(
    () => buildCoachingSessionScopeId(content),
    [content],
  );
  const narrationBody = useMemo(
    () => ({
      reflection: content.reflection,
      question: content.question,
      experiment: content.experiment,
    }),
    [content],
  );

  return (
    <ReadAloudListenPlayer
      playbackPlan={playbackPlan}
      sessionScopeId={sessionScopeId}
      sessionStorage={coachingSessionStorage}
      sectionControlId={`coaching-read-aloud-section-${sessionScopeId.length}`}
      preferences={preferences}
      openAiNarrationAvailable={openAiNarrationAvailable}
      openAiNarrationOptions={{
        enabled: false,
        mediaSessionAlbum: "Coaching",
        api: {
          planUrl: "/api/coaching/narration/plan",
          chunkUrl: "/api/coaching/narration/chunk",
          regenerateUrl: "/api/coaching/narration/regenerate",
          mediaSessionTitle: "Coaching feedback",
          mediaSessionAlbum: "Coaching",
          buildPlanBody: () => narrationBody,
          buildChunkBody: (chunkIndex, regenerate) => ({
            ...narrationBody,
            chunkIndex,
            regenerate,
          }),
          buildRegenerateBody: () => ({}),
          buildSameOriginChunkUrl: (chunkIndex) => {
            const params = new URLSearchParams({
              reflection: content.reflection,
              chunkIndex: String(chunkIndex),
            });

            if (content.question) {
              params.set("question", content.question);
            }

            if (content.experiment) {
              params.set("experiment", content.experiment);
            }

            return `/api/coaching/narration/chunk?${params.toString()}`;
          },
        },
      }}
      className={className}
      onSwitchToDevice={onSwitchToDevice}
    />
  );
}
