import Link from "next/link";

const linkClass =
  "inline-flex min-h-12 items-center justify-center rounded-xl border border-teal-800/20 bg-teal-50 px-4 text-sm font-medium text-teal-900 transition-colors hover:bg-teal-100";

type NewPlanLinkProps = {
  className?: string;
  fullWidth?: boolean;
};

export function NewPlanLink({ className = "", fullWidth = false }: NewPlanLinkProps) {
  return (
    <Link
      href="/plans/new"
      className={`${linkClass} ${fullWidth ? "w-full" : ""} ${className}`}
    >
      New plan
    </Link>
  );
}
