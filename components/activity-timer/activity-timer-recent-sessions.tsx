"use client";

import type { SerializedActivityTimerSession } from "@/lib/activity-timer/constants";

type ActivityTimerRecentSessionsProps = {
  sessions: SerializedActivityTimerSession[];
  onSelect: (session: SerializedActivityTimerSession) => void;
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
  onSelect,
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
                  <button
                    type="button"
                    onClick={() => onSelect(session)}
                    className="w-full rounded-2xl border border-border-soft bg-surface p-4 text-left shadow-sm transition-colors hover:bg-accent-cream/15"
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
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
