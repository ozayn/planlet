"use client";

import { ExternalLink } from "lucide-react";

import {
  getSourceLinkAriaLabel,
  getSourceLinkLabel,
  getSourceLinkTitle,
  getSourcePlatformLabel,
} from "@/lib/life-lab/source-url";

type LifeLabSourceLinkProps = {
  href: string;
  className?: string;
};

export function LifeLabSourceLink({ href, className = "" }: LifeLabSourceLinkProps) {
  const platformLabel = getSourcePlatformLabel(href);
  const label = getSourceLinkLabel(platformLabel);
  const ariaLabel = getSourceLinkAriaLabel(platformLabel);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-10 items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-foreground ${className}`.trim()}
      aria-label={ariaLabel}
      title={getSourceLinkTitle(platformLabel)}
    >
      <span>{label.replace(" ↗", "")}</span>
      <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
    </a>
  );
}
