import { LifeLabSectionHeading } from "@/components/life-lab/life-lab-section-heading";
import { LifeLabVideoRow } from "@/components/life-lab/life-lab-video-row";
import type { LifeLabNoteSummary, LifeLabSectionId } from "@/lib/life-lab/constants";

type LifeLabRecentlyAddedProps = {
  sectionId: LifeLabSectionId;
  notes: LifeLabNoteSummary[];
};

type LifeLabContinueLearningProps = {
  sectionId: LifeLabSectionId;
  notes: LifeLabNoteSummary[];
};

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
          <LifeLabVideoRow key={note.slug} sectionId={sectionId} note={note} />
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
          <LifeLabVideoRow key={note.slug} sectionId={sectionId} note={note} />
        ))}
      </ul>
    </section>
  );
}
