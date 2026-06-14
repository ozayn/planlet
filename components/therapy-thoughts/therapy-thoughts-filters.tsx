"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { TherapyThoughtCollectionFilter } from "@/lib/therapy-thoughts";

const FILTERS: { value: TherapyThoughtCollectionFilter; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All" },
];

type TherapyThoughtsFiltersProps = {
  activeFilter: TherapyThoughtCollectionFilter;
};

export function TherapyThoughtsFilters({
  activeFilter,
}: TherapyThoughtsFiltersProps) {
  const pathname = usePathname();

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Filter therapy thoughts"
    >
      {FILTERS.map((filter) => {
        const isActive = filter.value === activeFilter;
        const href =
          filter.value === "7d"
            ? pathname
            : `${pathname}?filter=${filter.value}`;

        return (
          <Link
            key={filter.value}
            href={href}
            aria-current={isActive ? "true" : undefined}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "border-border-subtle bg-accent-cream text-foreground"
                : "border-border-soft bg-transparent text-muted hover:text-foreground"
            }`}
          >
            {filter.label}
          </Link>
        );
      })}
    </div>
  );
}
