import { LifeLabNoteContent } from "@/components/life-lab/life-lab-note-content";
import type { LifeLabNoteMetadata } from "@/lib/life-lab/constants";

type LifeLabNoteDictionarySectionsProps = {
  content: string;
  noteTitle: string;
  metadata?: LifeLabNoteMetadata;
};

/**
 * @deprecated Prefer LifeLabNoteContent — kept as a thin alias for call sites
 * that historically forked dictionary notes onto a separate renderer.
 */
export function LifeLabNoteDictionarySections({
  content,
  noteTitle,
  metadata,
}: LifeLabNoteDictionarySectionsProps) {
  return (
    <LifeLabNoteContent
      content={content}
      noteTitle={noteTitle}
      metadata={metadata}
    />
  );
}
