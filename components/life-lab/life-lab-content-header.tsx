"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import {
  resolveTextDirection,
  textDirectionLang,
} from "@/lib/text-direction";

type LifeLabContentHeaderProps = {
  backHref: string;
  backLabel: string;
  title: string;
  metadata?: ReactNode;
  tabs?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function LifeLabContentHeader({
  backHref,
  backLabel,
  title,
  metadata,
  tabs,
  actions,
  footer,
  className = "",
}: LifeLabContentHeaderProps) {
  const titleDirection = resolveTextDirection(title);

  return (
    <header
      data-life-lab-content-header=""
      className={`space-y-3 ${className}`.trim()}
    >
      <Link
        href={backHref}
        data-life-lab-back-link=""
        className="inline-flex min-h-11 items-center text-sm text-muted transition-colors hover:text-foreground"
      >
        ← {backLabel}
      </Link>

      <div className="space-y-1.5">
        <h1
          className="text-xl font-semibold leading-snug tracking-tight text-foreground [overflow-wrap:anywhere] md:text-2xl md:leading-tight"
          dir={titleDirection}
          lang={textDirectionLang(titleDirection)}
        >
          {title}
        </h1>
        {metadata}
      </div>

      {tabs}
      {actions}
      {footer}
    </header>
  );
}
