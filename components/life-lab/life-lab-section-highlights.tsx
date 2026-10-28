import { LifeLabSectionHeading } from "@/components/life-lab/life-lab-section-heading";
import { LifeLabVideoRow } from "@/components/life-lab/life-lab-video-row";
import type { LifeLabNoteSummary, LifeLabSectionId } from "@/lib/life-lab/constants";
import { noteLibraryDedupeKey } from "@/lib/life-lab/youtube-library";

type LifeLabRecentlyAddedProps = {
  sectionId: LifeLabSectionId;
  notes: LifeLabNoteSummary[];
};

type LifeLabContinueLearningProps = {
  sectionId: LifeLabSectionId;
  notes: LifeLabNoteSummary[];
};

function noteListKey(note: LifeLabNoteSummary): string {
  return noteLibraryDedupeKey(note) || note.fileId || note.relativePath || note.slug;
}

export function LifeLabContinueLearning({
  sectionId,
  notes,
}: LifeLabContinueLearningProps) {
  if (notes.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <LifeLabSectionHeading>Continue learning</LifeLabSectionHeading>
      <ul className="space-y-0.5">
        {notes.map((note) => (
          <LifeLabVideoRow
            key={noteListKey(note)}
            sectionId={sectionId}
            note={note}
          />
        ))}
      </ul>
    </section>
  );
}

export function LifeLabRecentlyAdded({
  sectionId,
  notes,
}: LifeLabRecentlyAddedProps) {
  if (notes.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <LifeLabSectionHeading>Recently added</LifeLabSectionHeading>
      <ul className="space-y-0.5">
        {notes.map((note) => (
          <LifeLabVideoRow
            key={noteListKey(note)}
            sectionId={sectionId}
            note={note}
          />
        ))}
      </ul>
    </section>
  );
}
