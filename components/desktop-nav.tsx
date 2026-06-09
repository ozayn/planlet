import Link from "next/link";

import { PRODUCT } from "@/config/product";

const navItems = [
  { href: "/today", label: "Today" },
  { href: "/plans", label: "Plans" },
  { href: "/insights", label: "Insights" },
  { href: "/settings", label: "Settings" },
] as const;

type DesktopNavProps = {
  userName?: string | null;
};

export function DesktopNav({ userName }: DesktopNavProps) {
  return (
    <header className="hidden border-b border-stone-200 bg-white md:block">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <Link
          href="/today"
          className="text-lg font-medium tracking-tight text-stone-900"
        >
          {PRODUCT.name}
        </Link>
        <nav className="flex items-center gap-6" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-stone-600 transition-colors hover:text-stone-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {userName ? (
          <p className="max-w-32 truncate text-sm text-stone-500" dir="auto">
            {userName}
          </p>
        ) : (
          <span className="w-20" />
        )}
      </div>
    </header>
  );
}
