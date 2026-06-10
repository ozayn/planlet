import type { KudosType } from "@/app/generated/prisma/client";

import { UserAvatar } from "@/components/user-avatar";
import { getSenderKudosTooltip } from "@/lib/kudos-labels";

const MAX_VISIBLE_AVATARS = 3;

export type PlanKudosEntry = {
  id: string;
  type: KudosType;
  sender: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
};

type PlanKudosSummaryProps = {
  kudos: PlanKudosEntry[];
};

function kudosCountLabel(count: number): string {
  return count === 1 ? "Kudos from 1 person" : `Kudos from ${count} people`;
}

export function PlanKudosSummary({ kudos }: PlanKudosSummaryProps) {
  if (kudos.length === 0) {
    return null;
  }

  const visible = kudos.slice(0, MAX_VISIBLE_AVATARS);
  const overflow = kudos.length - visible.length;
  const groupLabel = kudosCountLabel(kudos.length);

  return (
    <div className="flex items-center gap-2 py-0.5">
      <KudosSparkIcon className="h-3.5 w-3.5 shrink-0 text-muted-light" />
      <div
        className="flex min-w-0 items-center gap-2"
        aria-label={groupLabel}
        role="group"
      >
        <div className="flex items-center">
          {visible.map((entry, index) => (
            <span
              key={entry.id}
              title={getSenderKudosTooltip(entry.sender, entry.type)}
              aria-label={getSenderKudosTooltip(entry.sender, entry.type)}
              className={`relative inline-flex rounded-full ring-2 ring-surface ${
                index > 0 ? "-ms-2" : ""
              }`}
            >
              <UserAvatar
                name={entry.sender.name}
                email={entry.sender.email}
                image={entry.sender.image}
                size="xs"
              />
            </span>
          ))}
          {overflow > 0 ? (
            <span
              title={kudos
                .slice(MAX_VISIBLE_AVATARS)
                .map((entry) => getSenderKudosTooltip(entry.sender, entry.type))
                .join(", ")}
              aria-label={
                overflow === 1
                  ? "1 more person sent kudos"
                  : `${overflow} more people sent kudos`
              }
              className="relative -ms-2 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-soft bg-accent-cream text-[0.625rem] font-medium text-muted"
            >
              +{overflow}
            </span>
          ) : null}
        </div>
        <span className="text-xs text-muted-light">sent kudos</span>
      </div>
    </div>
  );
}

function KudosSparkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="m12 3 1.2 3.6L17 8l-3.8 1.4L12 13l-1.2-3.6L7 8l3.8-1.4L12 3z" />
      <path d="M5 17l.8 2.2L8 20l-2.2.8L5 23l-.8-2.2L2 20l2.2-.8L5 17z" />
    </svg>
  );
}
