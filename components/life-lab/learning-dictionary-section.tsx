"use client";

import { useState } from "react";

import { LearningDictionaryEntryRow } from "@/components/life-lab/learning-dictionary-entry-row";
import type { LifeLabNoteGroup, LifeLabSectionId } from "@/lib/life-lab/constants";

const INITIAL_VISIBLE = 7;

type LearningDictionarySectionProps = {
  sectionId: LifeLabSectionId;
  group: LifeLabNoteGroup;
};

export function LearningDictionarySection({
  sectionId,
  group,
}: LearningDictionarySectionProps) {
  const [expanded, setExpanded] = useState(false);
  const hasOverflow = group.notes.length > INITIAL_VISIBLE;
  const visibleNotes =
    hasOverflow && !expanded
      ? group.notes.slice(0, INITIAL_VISIBLE)
      : group.notes;

  if (group.variant === "disclosure") {
    return (
      <details className="ui-settings-details group">
        <summary className="ui-settings-details-summary !text-sm !normal-case !tracking-normal">
          <span className="font-medium text-muted">
            {group.label}
            {group.notes.length > 0 ? ` · ${group.notes.length}` : ""}
          </span>
        </summary>
        <div className="ui-settings-details-body">
          <ul>
            {group.notes.map((note) => (
              <LearningDictionaryEntryRow
                key={note.slug}
                note={note}
                href={`/life-lab/${sectionId}/${note.slug}`}
              />
            ))}
          </ul>
        </div>
      </details>
    );
  }

  return (
    <section className="space-y-1.5">
      <h2 className="text-sm font-medium text-muted">
        {group.label}
        <span className="font-normal text-muted-light">
          {" "}
          · {group.notes.length}
        </span>
      </h2>
      <ul>
        {visibleNotes.map((note) => (
          <LearningDictionaryEntryRow
            key={note.slug}
            note={note}
            href={`/life-lab/${sectionId}/${note.slug}`}
          />
        ))}
      </ul>
      {hasOverflow ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="pt-1 text-xs font-medium text-muted transition-colors hover:text-foreground"
        >
          {expanded ? "Show less" : `View all ${group.notes.length} →`}
        </button>
      ) : null}
    </section>
  );
}
