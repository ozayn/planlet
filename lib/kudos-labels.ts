import type { KudosType } from "@/app/generated/prisma/client";

export const KUDOS_TYPE_EMOJIS: Record<KudosType, string> = {
  CHEER: "👏",
  PROUD: "🌟",
  ROOTING: "🌱",
  WARMTH: "🤍",
};

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

export function getKudosTypeEmoji(type: KudosType): string {
  return KUDOS_TYPE_EMOJIS[type];
}

export function getKudosTypeLabel(type: KudosType): string {
  return KUDOS_TYPE_LABELS[type];
}

export function getKudosTypeShortLabel(type: KudosType): string {
  return KUDOS_TYPE_SHORT_LABELS[type];
}

export function getKudosReactionLabel(type: KudosType): string {
  return `${getKudosTypeEmoji(type)} ${getKudosTypeShortLabel(type)}`;
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
      return "cheered you on for";
    case "PROUD":
      return "is proud of you for";
    case "ROOTING":
      return "is rooting for you for";
    case "WARMTH":
      return "sent warmth for";
    default:
      return "sent kudos for";
  }
}

export function getSenderKudosTooltip(
  sender: { name: string | null; email: string | null },
  type: KudosType,
): string {
  const name = formatUserLabel(sender);
  return `${name} sent ${getKudosTypeEmoji(type)} ${getKudosTypeShortLabel(type)}`;
}
