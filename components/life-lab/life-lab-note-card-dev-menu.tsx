import type { LifeLabNoteSummary, LifeLabSectionId } from "@/lib/life-lab/constants";
import { isLifeLabDevToolsEnabled } from "@/lib/life-lab/dev";
import { LifeLabNoteDevTools } from "@/components/life-lab/life-lab-note-dev-tools";

type LifeLabNoteCardDevMenuProps = {
  sectionId: LifeLabSectionId;
  note: LifeLabNoteSummary;
};

export function LifeLabNoteCardDevMenu({
  sectionId,
  note,
}: LifeLabNoteCardDevMenuProps) {
  if (!isLifeLabDevToolsEnabled() || !note.dev) {
    return null;
  }

  return (
    <LifeLabNoteDevTools
      sectionId={sectionId}
      slug={note.slug}
      dev={note.dev}
      compact
    />
  );
}
