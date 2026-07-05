import type { LifeLabNote } from "@/lib/life-lab/constants";
import { isLifeLabDevToolsEnabled } from "@/lib/life-lab/dev";
import { LifeLabNoteDevTools } from "@/components/life-lab/life-lab-note-dev-tools";

type LifeLabNoteDevToolbarProps = {
  note: LifeLabNote;
};

export function LifeLabNoteDevToolbar({ note }: LifeLabNoteDevToolbarProps) {
  if (!isLifeLabDevToolsEnabled() || !note.dev) {
    return null;
  }

  return (
    <LifeLabNoteDevTools
      sectionId={note.sectionId}
      slug={note.slug}
      dev={note.dev}
      markdown={note.content}
      compact
    />
  );
}
