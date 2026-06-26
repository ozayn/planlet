import type { PokeType } from "@/app/generated/prisma/client";

export const POKE_TYPE_EMOJIS: Record<PokeType, string> = {
  ENCOURAGE: "🌱",
  CHECK_IN: "☕",
  CELEBRATE: "🎉",
  LEARN: "📚",
  FOCUS: "🎯",
  PAUSE: "🧘",
  THINKING_OF_YOU: "❤️",
};

export const POKE_TYPE_LABELS: Record<PokeType, string> = {
  ENCOURAGE: "Encourage",
  CHECK_IN: "Check in",
  CELEBRATE: "Celebrate",
  LEARN: "Learn",
  FOCUS: "Focus",
  PAUSE: "Pause",
  THINKING_OF_YOU: "Thinking of you",
};

export const POKE_TYPE_SHORT_PHRASES: Record<PokeType, string> = {
  ENCOURAGE: "sent you encouragement",
  CHECK_IN: "checked in",
  CELEBRATE: "celebrated with you",
  LEARN: "sent a learning nudge",
  FOCUS: "sent a focus nudge",
  PAUSE: "sent a pause reminder",
  THINKING_OF_YOU: "is thinking of you",
};

export function getPokeTypeEmoji(type: PokeType): string {
  return POKE_TYPE_EMOJIS[type];
}

export function getPokeTypeLabel(type: PokeType): string {
  return POKE_TYPE_LABELS[type];
}

export function getPokeNotificationLine(input: {
  senderName: string | null;
  senderEmail: string | null;
  pokeType: PokeType;
}): string {
  const senderLabel =
    input.senderName?.trim() || input.senderEmail?.trim() || "Someone";
  return `${POKE_TYPE_EMOJIS[input.pokeType]} ${senderLabel} ${POKE_TYPE_SHORT_PHRASES[input.pokeType]}.`;
}

export function formatPokeUserLabel(input: {
  name: string | null;
  email: string | null;
}): string {
  return input.name?.trim() || input.email?.trim() || "Friend";
}
