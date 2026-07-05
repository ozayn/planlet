import type { LifeLabNoteMetadata, LifeLabSectionId } from "@/lib/life-lab/constants";
import {
  selectVisibleMetadataChips,
  type LifeLabChipContext,
} from "@/lib/life-lab/metadata-chips";

type LifeLabMetadataChipsProps = LifeLabChipContext & {
  metadata?: LifeLabNoteMetadata;
  className?: string;
};

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-accent-cream/60 px-2 py-0.5 text-[0.6875rem] font-medium text-muted">
      {label}
    </span>
  );
}

export function LifeLabMetadataChips({
  metadata,
  sectionId,
  sectionLabel,
  groupId,
  groupLabel,
  subfolderLabel,
  variant = "card",
  className = "",
}: LifeLabMetadataChipsProps) {
  const { visible, overflowCount } = selectVisibleMetadataChips(metadata, {
    sectionId,
    sectionLabel,
    groupId,
    groupLabel,
    subfolderLabel,
    variant,
  });

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {visible.map((label) => (
        <Chip key={label} label={label} />
      ))}
      {overflowCount > 0 ? (
        <span className="text-[0.6875rem] font-medium text-muted-light">
          +{overflowCount} more
        </span>
      ) : null}
    </div>
  );
}
