import type { LucideIcon } from "lucide-react";
import {
  Circle,
  CircleAlert,
  CircleCheck,
  CircleMinus,
  Play,
} from "lucide-react";

import type { PlaylistVideoStatus } from "@/lib/life-lab/playlist-index";

export const PLAYLIST_VIDEO_ICON_STROKE = 2;

export const PLAYLIST_VIDEO_INLINE_ICON_CLASS = "h-3.5 w-3.5 shrink-0";

export const PLAYLIST_VIDEO_ROW_ICON_CLASS = "h-4 w-4 shrink-0";

export const PLAYLIST_VIDEO_STATUS_LABELS: Record<PlaylistVideoStatus, string> =
  {
    processed: "Processed",
    pending: "Not processed",
    skipped: "Skipped",
    error: "Error",
  };

export type PlaylistVideoStatusIconConfig = {
  Icon: LucideIcon;
  label: string;
};

export function getPlaylistVideoStatusIcon(
  status: PlaylistVideoStatus,
): PlaylistVideoStatusIconConfig {
  switch (status) {
    case "processed":
      return { Icon: CircleCheck, label: PLAYLIST_VIDEO_STATUS_LABELS.processed };
    case "pending":
      return { Icon: Circle, label: PLAYLIST_VIDEO_STATUS_LABELS.pending };
    case "skipped":
      return { Icon: CircleMinus, label: PLAYLIST_VIDEO_STATUS_LABELS.skipped };
    case "error":
      return { Icon: CircleAlert, label: PLAYLIST_VIDEO_STATUS_LABELS.error };
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

type PlaylistVideoStatusIconProps = {
  status: PlaylistVideoStatus;
  className?: string;
};

export function PlaylistVideoStatusIcon({
  status,
  className = PLAYLIST_VIDEO_INLINE_ICON_CLASS,
}: PlaylistVideoStatusIconProps) {
  const { Icon, label } = getPlaylistVideoStatusIcon(status);

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="inline-flex text-muted"
    >
      <Icon
        className={className}
        strokeWidth={PLAYLIST_VIDEO_ICON_STROKE}
        aria-hidden="true"
      />
    </span>
  );
}

type PlaylistSourceIconProps = {
  className?: string;
};

export function PlaylistSourceIcon({
  className = PLAYLIST_VIDEO_INLINE_ICON_CLASS,
}: PlaylistSourceIconProps) {
  return (
    <Play
      className={className}
      strokeWidth={PLAYLIST_VIDEO_ICON_STROKE}
      aria-hidden="true"
    />
  );
}
