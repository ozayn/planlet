import type { KudosType } from "@/app/generated/prisma/client";

export const KUDOS_TYPE_LABELS: Record<KudosType, string> = {
  CHEER: "Cheering you on",
  PROUD: "Proud of you",
  ROOTING: "Rooting for you",
  WARMTH: "Sending warmth",
};

export const KUDOS_TYPE_SHORT_LABELS: Record<KudosType, string> = {
  CHEER: "Cheer",
  PROUD: "Proud",
  ROOTING: "Rooting",
  WARMTH: "Warmth",
};

export const KUDOS_TYPES: KudosType[] = [
  "CHEER",
  "PROUD",
  "ROOTING",
  "WARMTH",
];

export function getKudosTypeLabel(type: KudosType): string {
  return KUDOS_TYPE_LABELS[type];
}

export function getKudosTypeShortLabel(type: KudosType): string {
  return KUDOS_TYPE_SHORT_LABELS[type];
}

export function formatUserLabel(input: {
  name: string | null;
  email: string | null;
}): string {
  return input.name?.trim() || input.email?.trim() || "Someone";
}

export function getKudosNotificationPhrase(type: KudosType): string {
  switch (type) {
    case "CHEER":
      return "is cheering you on for";
    case "PROUD":
      return "is proud of you for";
    case "ROOTING":
      return "is rooting for you on";
    case "WARMTH":
      return "is sending warmth for";
    default:
      return "sent kudos for";
  }
}
