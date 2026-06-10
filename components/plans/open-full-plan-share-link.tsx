import Link from "next/link";

const LABEL = "Open full plan to share inside Planlet";

type OpenFullPlanShareLinkProps = {
  href: string;
};

export function OpenFullPlanShareLink({ href }: OpenFullPlanShareLinkProps) {
  return (
    <Link
      href={href}
      aria-label={LABEL}
      title={LABEL}
      className="ui-icon-action"
    >
      <ShareIcon className="h-4 w-4" aria-hidden="true" />
      <span className="ui-tooltip-bubble" role="tooltip">
        {LABEL}
      </span>
    </Link>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  );
}
