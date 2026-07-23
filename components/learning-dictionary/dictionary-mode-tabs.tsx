"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type DictionaryMode = "browse" | "learn";

export function DictionaryModeTabs({
  active,
}: {
  active: DictionaryMode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(mode: DictionaryMode): string {
    const params = new URLSearchParams(searchParams.toString());

    if (mode === "browse") {
      params.delete("view");
    } else {
      params.set("view", "learn");
    }

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <div
      className="inline-flex rounded-xl border border-border/70 bg-surface p-0.5"
      role="tablist"
      aria-label="Dictionary view"
    >
      {(
        [
          { id: "browse", label: "Browse" },
          { id: "learn", label: "Learn" },
        ] as const
      ).map((tab) => {
        const isActive = tab.id === active;

        return (
          <Link
            key={tab.id}
            href={hrefFor(tab.id)}
            role="tab"
            aria-selected={isActive}
            className={`min-h-9 rounded-lg px-3.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-accent-cream text-foreground"
                : "text-muted hover:text-foreground"
            } inline-flex items-center`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
