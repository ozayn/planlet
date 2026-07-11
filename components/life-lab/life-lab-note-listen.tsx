"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { updateLifeLabReadAloudProviderAction } from "@/app/(app)/settings/actions";
import { LifeLabListenPlayer } from "@/components/life-lab/life-lab-listen-player";
import type { LifeLabReadAloudPreferences } from "@/lib/life-lab/read-aloud-preferences";

type LifeLabNoteListenProps = {
  title: string;
  content: string;
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

  function handleSwitchToDevice(): void {
    startTransition(async () => {
      await updateLifeLabReadAloudProviderAction("DEVICE");
      router.refresh();
    });
  }

  return (
    <LifeLabListenPlayer
      title={title}
      content={content}
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
