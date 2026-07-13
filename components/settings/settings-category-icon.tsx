import type { ReactNode } from "react";

import type { SettingsCategoryIconName } from "@/lib/settings/types";

type IconProps = {
  className?: string;
};

function IconShell({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function SettingsCategoryIcon({
  name,
  className = "h-5 w-5",
}: {
  name: SettingsCategoryIconName;
  className?: string;
}) {
  switch (name) {
    case "appearance":
      return (
        <IconShell className={className}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3c-1.5 2.2-4.5 2.4-4.5 6.2a4.5 4.5 0 1 0 9 0C16.5 5.4 13.5 5.2 12 3Z"
          />
          <path strokeLinecap="round" d="M12 14.5V21" />
        </IconShell>
      );
    case "ai":
      return (
        <IconShell className={className}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7.5h8M7 12h10M9 16.5h6"
          />
          <rect x="4.5" y="4.5" width="15" height="15" rx="3" />
        </IconShell>
      );
    case "voice-audio":
      return (
        <IconShell className={className}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5a2.5 2.5 0 0 0-2.5 2.5v5a2.5 2.5 0 0 0 5 0V7a2.5 2.5 0 0 0-2.5-2.5Z"
          />
          <path strokeLinecap="round" d="M8.5 12.5v1a3.5 3.5 0 0 0 7 0v-1" />
          <path strokeLinecap="round" d="M12 17v2.5" />
        </IconShell>
      );
    case "timer":
      return (
        <IconShell className={className}>
          <circle cx="12" cy="13" r="7.5" />
          <path strokeLinecap="round" d="M12 9.5V13l2.5 1.5M9.5 3.5h5" />
        </IconShell>
      );
    case "life-lab":
      return (
        <IconShell className={className}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.5 18.5 12 5.5l5.5 13"
          />
          <path strokeLinecap="round" d="M8.5 14.5h7" />
        </IconShell>
      );
    case "planner":
      return (
        <IconShell className={className}>
          <rect x="4.5" y="6.5" width="15" height="13" rx="2" />
          <path strokeLinecap="round" d="M8 4.5v3M16 4.5v3M4.5 10.5h15" />
        </IconShell>
      );
    case "notifications":
      return (
        <IconShell className={className}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.5 18.5a2.5 2.5 0 0 0 5 0M6 9.5a6 6 0 1 1 12 0c0 4.5 1.5 6 1.5 6h-15s1.5-1.5 1.5-6Z"
          />
        </IconShell>
      );
    case "account":
      return (
        <IconShell className={className}>
          <circle cx="12" cy="9" r="3.5" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.5 19.5c.8-2.6 2.8-4 5.5-4s4.7 1.4 5.5 4"
          />
        </IconShell>
      );
    case "about":
      return (
        <IconShell className={className}>
          <circle cx="12" cy="12" r="8.5" />
          <path strokeLinecap="round" d="M12 10.5v5M12 8h.01" />
        </IconShell>
      );
  }
}
