"use client";

import Link from "next/link";

export type LifeLabModeTab = {
  id: string;
  label: string;
  href: string;
};

type LifeLabModeTabsProps = {
  tabs: LifeLabModeTab[];
  activeId: string;
  className?: string;
  "aria-label"?: string;
};

export function LifeLabModeTabs({
  tabs,
  activeId,
  className = "",
  "aria-label": ariaLabel = "Learning modes",
}: LifeLabModeTabsProps) {
  if (tabs.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label={ariaLabel}
      data-life-lab-mode-tabs=""
      className={`-mx-1 flex gap-0.5 overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`.trim()}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;

        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            data-life-lab-mode-tab={tab.id}
            data-active={active ? "true" : "false"}
            className={`inline-flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border ${
              active
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
