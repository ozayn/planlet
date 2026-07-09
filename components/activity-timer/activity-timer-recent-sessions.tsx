"use client";

import { ActivityTimerSessionDeleteButton } from "@/components/activity-timer/activity-timer-session-delete-button";
import type { SerializedActivityTimerSession } from "@/lib/activity-timer/constants";

type ActivityTimerRecentSessionsProps = {
  sessions: SerializedActivityTimerSession[];
  disabled?: boolean;
  onSelect: (session: SerializedActivityTimerSession) => void;
  onDelete: (sessionId: string) => void;
};

function groupSessionsByDay(sessions: SerializedActivityTimerSession[]) {
  const groups: Array<{ label: string; sessions: SerializedActivityTimerSession[] }> =
    [];

  for (const session of sessions) {
    const existing = groups.find((group) => group.label === session.dayGroupLabel);

    if (existing) {
      existing.sessions.push(session);
      continue;
    }

    groups.push({
      label: session.dayGroupLabel,
      sessions: [session],
    });
  }

  return groups;
}

export function ActivityTimerRecentSessions({
  sessions,
  disabled = false,
  onSelect,
  onDelete,
}: ActivityTimerRecentSessionsProps) {
  if (sessions.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Recent sessions</h2>
        <p className="text-sm text-muted">No sessions yet.</p>
      </section>
    );
  }

  const groups = groupSessionsByDay(sessions);

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Recent sessions</h2>
      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-light">
              {group.label}
            </p>
            <ul className="space-y-2">
              {group.sessions.map((session) => (
                <li key={session.id}>
                  <div className="flex items-start gap-1 rounded-2xl border border-border-soft bg-surface shadow-sm transition-colors hover:bg-accent-cream/15">
                    <button
                      type="button"
                      onClick={() => onSelect(session)}
                      disabled={disabled}
                      className="min-w-0 flex-1 p-4 text-left disabled:opacity-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {session.title}
                          </p>
                          <p className="text-xs text-muted-light">
                            {session.clockTimeLabel}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm text-muted">
                          {session.durationShortLabel}
                        </p>
                      </div>
                      {session.notesPreview ? (
                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-light">
                          {session.notesPreview}
                        </p>
                      ) : null}
                      {session.sessionNotes.length > 0 ? (
                        <ul className="mt-2 space-y-1">
                          {session.sessionNotes.slice(0, 2).map((note) => (
                            <li
                              key={note.id}
                              className="text-xs leading-relaxed text-muted-light"
                            >
                              {note.displayLabel}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </button>
                    <div className="flex shrink-0 items-start pt-3 pr-2">
                      <ActivityTimerSessionDeleteButton
                        disabled={disabled}
                        onClick={() => onDelete(session.id)}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
