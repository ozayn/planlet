import Link from "next/link";

const ACCENT_BARS = [
  "ui-accent-bar-red",
  "ui-accent-bar-blue",
  "ui-accent-bar-yellow",
] as const;

type DashboardCardProps = {
  href: string;
  title: string;
  description: string;
  accentIndex?: number;
};

export function DashboardCard({
  href,
  title,
  description,
  accentIndex = 0,
}: DashboardCardProps) {
  const accentBar =
    ACCENT_BARS[accentIndex % ACCENT_BARS.length] ?? ACCENT_BARS[0];

  return (
    <Link
      href={href}
      className="ui-card group relative flex min-h-28 flex-col justify-center overflow-hidden px-5 py-5 transition-colors hover:bg-accent-cream/40"
    >
      <span
        className={`absolute inset-y-5 start-0 w-1 rounded-full ${accentBar}`}
        aria-hidden="true"
      />
      <h2 className="ps-3 text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-1.5 ps-3 text-sm leading-relaxed text-muted">
        {description}
      </p>
    </Link>
  );
}
