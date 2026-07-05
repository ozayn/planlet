import { MarkdownContent } from "@/components/life-lab/markdown-content";
import type { SaveWorthyGroup } from "@/lib/life-lab/reading-briefs";

type LifeLabReadingBriefSaveWorthyProps = {
  groups: SaveWorthyGroup[];
};

function SaveWorthyGroupSection({
  group,
  defaultOpen = false,
}: {
  group: SaveWorthyGroup;
  defaultOpen?: boolean;
}) {
  if (defaultOpen) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
          {group.label}
        </h3>
        <MarkdownContent content={group.content} compact readingBriefMode />
      </div>
    );
  }

  return (
    <details className="ui-settings-details group">
      <summary className="ui-settings-details-summary">{group.label}</summary>
      <div className="ui-settings-details-body">
        <MarkdownContent content={group.content} compact readingBriefMode />
      </div>
    </details>
  );
}

export function LifeLabReadingBriefSaveWorthy({
  groups,
}: LifeLabReadingBriefSaveWorthyProps) {
  if (groups.length === 0) {
    return null;
  }

  const mustGroup = groups.find((group) => group.id === "must");
  const secondaryGroups = groups.filter((group) => group.id !== "must");
  const isLong = groups.reduce(
    (total, group) => total + group.content.length,
    0,
  ) > 280;

  if (!isLong && groups.length === 1 && mustGroup) {
    return (
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">
          Save-worthy articles
        </h2>
        <SaveWorthyGroupSection group={mustGroup} defaultOpen />
      </section>
    );
  }

  return (
    <details className="ui-settings-details group">
      <summary className="ui-settings-details-summary">
        Save-worthy articles
      </summary>
      <div className="ui-settings-details-body space-y-3">
        {mustGroup ? (
          <SaveWorthyGroupSection group={mustGroup} defaultOpen />
        ) : null}
        {secondaryGroups.map((group) => (
          <SaveWorthyGroupSection key={group.id} group={group} />
        ))}
      </div>
    </details>
  );
}
