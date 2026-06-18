import Link from "next/link";

type InsightsPeriodLinksProps = {
  weekHref: string;
  monthHref: string;
  yearHref: string;
};

export function InsightsPeriodLinks({
  weekHref,
  monthHref,
  yearHref,
}: InsightsPeriodLinksProps) {
  const links = [
    { href: weekHref, label: "Week" },
    { href: monthHref, label: "Month" },
    { href: yearHref, label: "Year" },
  ] as const;

  return (
    <nav
      className="ui-insights-period-links flex flex-wrap gap-1.5"
      aria-label="Period summaries"
    >
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="ui-insights-period-chip"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
