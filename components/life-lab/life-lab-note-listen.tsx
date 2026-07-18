"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { updateLifeLabReadAloudProviderAction } from "@/app/(app)/settings/actions";
import { LifeLabListenPlayer } from "@/components/life-lab/life-lab-listen-player";
import { useLifeLabSpeechDisclosures } from "@/components/life-lab/life-lab-speech-visibility";
import type { LifeLabNoteMetadata } from "@/lib/life-lab/constants";
import type { LifeLabReadAloudPreferences } from "@/lib/life-lab/read-aloud-preferences";
import { prepareLifeLabSpeechMarkdown } from "@/lib/life-lab/speech-renderer";

type LifeLabNoteListenProps = {
  title: string;
  content: string;
  metadata?: LifeLabNoteMetadata;
  sectionId: string;
  slug: string;
  fileId: string;
  preferences: LifeLabReadAloudPreferences;
  openAiNarrationAvailable: boolean;
  includeFlashcards?: boolean;
  className?: string;
};

export function LifeLabNoteListen({
  title,
  content,
  metadata,
  sectionId,
  slug,
  fileId,
  preferences,
  openAiNarrationAvailable,
  includeFlashcards = true,
  className = "",
}: LifeLabNoteListenProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const disclosures = useLifeLabSpeechDisclosures();
  const speechContent = prepareLifeLabSpeechMarkdown({
    content,
    metadata,
    disclosures,
  });
  const expandedSectionTitles = disclosures.flatMap((disclosure) => {
    if (!disclosure.expanded) {
      return [];
    }

    const title = disclosure.markdown.match(/^#{1,6}\s+(.+?)\s*$/m)?.[1];
    return title ? [title.trim()] : [];
  });

  function handleSwitchToDevice(): void {
    startTransition(async () => {
      await updateLifeLabReadAloudProviderAction("DEVICE");
      router.refresh();
    });
  }

  return (
    <LifeLabListenPlayer
      title={title}
      content={speechContent}
      metadata={metadata}
      expandedSectionTitles={expandedSectionTitles}
      sectionId={sectionId}
      slug={slug}
      fileId={fileId}
      preferences={preferences}
      openAiNarrationAvailable={openAiNarrationAvailable}
      includeFlashcards={includeFlashcards}
      className={className}
      onSwitchToDevice={handleSwitchToDevice}
    />
  );
}
