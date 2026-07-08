"use client";

import type { ComponentType } from "react";

import type { LucideProps } from "lucide-react";
import {
  BookOpen,
  Brain,
  Camera,
  Circle,
  Dumbbell,
  Droplets,
  Flower2,
  Footprints,
  House,
  Laptop,
  Map,
  Pencil,
  PersonStanding,
  Search,
  Shirt,
  Sparkles,
  Utensils,
} from "lucide-react";

import { resolvePresetIconName } from "@/lib/activity-timer/preset-icons";

type ActivityPresetIconProps = {
  iconName?: string | null;
  className?: string;
};

type IconComponent = ComponentType<LucideProps>;

function StairsIcon({ className, strokeWidth = 1.75 }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 20h4V12h4v8h4V4h4v16" />
    </svg>
  );
}

const PRESET_ICON_MAP: Record<string, IconComponent> = {
  foot: Footprints,
  stairs: StairsIcon,
  stretch: PersonStanding,
  "book-open": BookOpen,
  brain: Brain,
  camera: Camera,
  droplets: Droplets,
  lotus: Flower2,
  home: House,
  utensils: Utensils,
  shirt: Shirt,
  reading: BookOpen,
  pencil: Pencil,
  laptop: Laptop,
  search: Search,
  map: Map,
  dumbbell: Dumbbell,
  sparkles: Sparkles,
  circle: Circle,
};

export function ActivityPresetIcon({
  iconName,
  className = "size-[18px] shrink-0 text-muted",
}: ActivityPresetIconProps) {
  const resolvedName = resolvePresetIconName(iconName);
  const Icon = PRESET_ICON_MAP[resolvedName];

  return <Icon className={className} strokeWidth={1.75} aria-hidden="true" />;
}
