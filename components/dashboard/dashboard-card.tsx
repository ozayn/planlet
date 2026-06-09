import Link from "next/link";

type DashboardCardProps = {
  href: string;
  title: string;
  description: string;
};

export function DashboardCard({
  href,
  title,
  description,
}: DashboardCardProps) {
  return (
    <Link
      href={href}
      className="flex min-h-24 flex-col justify-center rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-stone-300 hover:bg-stone-50/50"
    >
      <h2 className="text-sm font-medium text-stone-900">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-stone-500">{description}</p>
    </Link>
  );
}
