"use client";

import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

import {
  getSourceLinkAriaLabel,
  getSourcePlatformLabel,
} from "@/lib/life-lab/source-url";

type LifeLabCompactSourceMetaProps = {
  dateLabel?: string | null;
  channelLabel?: string | null;
  platformLabel?: string | null;
  sourceHref?: string | null;
  statusLabel?: string | null;
  className?: string;
};

export function LifeLabCompactSourceMeta({
  dateLabel,
  channelLabel,
  platformLabel,
  sourceHref,
  statusLabel,
  className = "",
}: LifeLabCompactSourceMetaProps) {
  const resolvedPlatform =
    platformLabel ??
    (sourceHref ? getSourcePlatformLabel(sourceHref) : null);
  const parts: ReactNode[] = [];

  if (channelLabel) {
    parts.push(
      <span key="channel" className="text-muted">
        {channelLabel}
      </span>,
    );
  }

  if (resolvedPlatform) {
    parts.push(
      <span key="platform" className="text-muted">
        {resolvedPlatform}
      </span>,
    );
  }

  if (dateLabel) {
    parts.push(
      <span key="date" className="text-muted">
        {dateLabel}
      </span>,
    );
  }

  if (sourceHref) {
    const ariaLabel = getSourceLinkAriaLabel(
      resolvedPlatform ?? getSourcePlatformLabel(sourceHref),
    );
    parts.push(
      <a
        key="source"
        href={sourceHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        title={ariaLabel}
        data-life-lab-open-original=""
        className="inline-flex items-center gap-1 font-medium text-muted transition-colors hover:text-foreground"
      >
        <span>Open original</span>
        <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
      </a>,
    );
  }

  if (statusLabel) {
    parts.push(
      <span key="status" className="text-muted-light">
        {statusLabel}
      </span>,
    );
  }

  if (parts.length === 0) {
    return null;
  }

  return (
    <p
      data-life-lab-compact-meta=""
      className={`flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs leading-relaxed ${className}`.trim()}
      dir="auto"
    >
      {parts.map((part, index) => (
        <span key={index} className="inline-flex items-center gap-1.5">
          {index > 0 ? (
            <span className="text-muted-light" aria-hidden="true">
              ·
            </span>
          ) : null}
          {part}
        </span>
      ))}
    </p>
  );
}
