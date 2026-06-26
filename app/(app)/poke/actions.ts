"use server";

import type { PokeType } from "@/app/generated/prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  acknowledgePoke,
  dismissPoke,
  PokeError,
  sendPoke,
  type SerializedPoke,
} from "@/lib/poke";
import { touchUserSeenSafely } from "@/lib/user-activity";

type ActionResult<T = undefined> =
  | (T extends undefined ? { success: true } : { success: true } & T)
  | { success: false; error: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    throw new PokeError("Not signed in.");
  }

  return userId;
}

function revalidatePokeSurfaces() {
  revalidatePath("/poke", "layout");
  revalidatePath("/today", "layout");
  revalidatePath("/plans", "layout");
  revalidatePath("/insights", "layout");
  revalidatePath("/settings", "layout");
  revalidatePath("/dashboard", "layout");
}

export async function sendPokeAction(input: {
  recipientId: string;
  pokeType: PokeType;
  message?: string | null;
}): Promise<ActionResult<{ poke: SerializedPoke }>> {
  const userId = await requireUserId();

  try {
    const poke = await sendPoke(
      userId,
      input.recipientId,
      input.pokeType,
      input.message,
    );
    await touchUserSeenSafely(userId);
    revalidatePokeSurfaces();
    return { success: true, poke };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof PokeError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to send poke.",
    };
  }
}

export async function acknowledgePokeAction(
  pokeId: string,
): Promise<ActionResult<{ poke: SerializedPoke }>> {
  const userId = await requireUserId();

  try {
    const poke = await acknowledgePoke(userId, pokeId);
    await touchUserSeenSafely(userId);
    revalidatePokeSurfaces();
    return { success: true, poke };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof PokeError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to acknowledge nudge.",
    };
  }
}

export async function dismissPokeAction(
  pokeId: string,
): Promise<ActionResult> {
  const userId = await requireUserId();

  try {
    await dismissPoke(userId, pokeId);
    await touchUserSeenSafely(userId);
    revalidatePokeSurfaces();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof PokeError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to dismiss nudge.",
    };
  }
}
