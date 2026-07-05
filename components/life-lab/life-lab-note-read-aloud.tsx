"use client";

import { ReadAloudControls } from "@/components/life-lab/read-aloud-controls";
import { prepareNoteSpeechChunks } from "@/lib/life-lab/speech";

type LifeLabNoteReadAloudProps = {
  title: string;
  content: string;
  className?: string;
};

export function LifeLabNoteReadAloud({
  title,
  content,
  className = "",
}: LifeLabNoteReadAloudProps) {
  const speechChunks = prepareNoteSpeechChunks(title, content);

  if (speechChunks.length === 0) {
    return null;
  }

  return (
    <ReadAloudControls
      text={speechChunks}
      className={className}
    />
  );
}
