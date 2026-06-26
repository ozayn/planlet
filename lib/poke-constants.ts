import type { PokeType } from "@/app/generated/prisma/client";

export const MAX_POKE_MESSAGE_LENGTH = 200;
export const MAX_POKES_PER_DAY = 10;
export const RECENT_POKES_LIMIT = 12;
export const POKE_CONTACTS_LIMIT = 24;

export const POKE_TYPES: readonly PokeType[] = [
  "ENCOURAGE",
  "CHECK_IN",
  "CELEBRATE",
  "LEARN",
  "FOCUS",
  "PAUSE",
  "THINKING_OF_YOU",
] as const;
