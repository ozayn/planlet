import type { PlanItemStatus } from "@/app/generated/prisma/client";

export function PlanItemStatusIcon({
  status,
  className,
}: {
  status: PlanItemStatus;
  className?: string;
}) {
  switch (status) {
    case "OPEN":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          stroke="currentColor"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
    case "DONE":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          stroke="currentColor"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="8" />
          <path d="m8.5 12.5 2.5 2.5 5-5.5" />
        </svg>
      );
    case "PARTIAL":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          stroke="currentColor"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="8" strokeDasharray="3 3" />
          <path d="M12 4v8l4 2" />
        </svg>
      );
    case "NOT_DONE":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          stroke="currentColor"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="8" />
          <path d="m9 9 6 6M15 9l-6 6" />
        </svg>
      );
    case "MOVED":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path d="m4 4 8 8v8" />
          <path d="M12 12h8" />
        </svg>
      );
    case "SKIPPED":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path d="M5 5l10 7-10 7V5z" />
          <path d="M19 5v14" />
        </svg>
      );
    case "RELEASED":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path d="M20 7c-2-2-5-3-8-2-3 1-5 4-5 7 0 2 1 4 3 5 2 1 5 .5 7-1" />
          <path d="M4 20c2-1 4-3 5-5" />
        </svg>
      );
    default:
      return null;
  }
}
