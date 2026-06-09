import Link from "next/link";

type NewPlanLinkProps = {
  className?: string;
  fullWidth?: boolean;
};

export function NewPlanLink({ className = "", fullWidth = false }: NewPlanLinkProps) {
  return (
    <Link
      href="/plans/new"
      className={`ui-btn-secondary inline-flex ${fullWidth ? "w-full" : ""} ${className}`}
    >
      New plan
    </Link>
  );
}
