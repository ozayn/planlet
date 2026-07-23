"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import type { LifeLabItemType } from "@/lib/life-lab/item-key";
import {
  archiveLifeLabItem,
  unarchiveLifeLabItem,
} from "@/lib/life-lab/item-state";
import { canAccessLifeLabPage } from "@/lib/roles";
import { SessionExpiredError } from "@/lib/require-auth";

export type LifeLabArchiveActionResult =
  | { success: true; archived: boolean; itemKey: string }
  | { success: false; error: string };

function revalidateLifeLabArchiveSurfaces(section: string) {
  revalidatePath("/life-lab");
  revalidatePath("/life-lab/archived");
  revalidatePath(`/life-lab/${section}`);
  if (section === "flashcards") {
    revalidatePath("/life-lab/flashcards");
  }
}

async function requireLifeLabUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    throw new SessionExpiredError();
  }
  return session.user.id;
}

export async function archiveLifeLabItemAction(input: {
  itemKey: string;
  section: string;
  itemType: LifeLabItemType;
}): Promise<LifeLabArchiveActionResult> {
  try {
    const userId = await requireLifeLabUserId();
    const itemKey = input.itemKey.trim();
    const section = input.section.trim();

    if (!itemKey || !section || !input.itemType) {
      return { success: false, error: "Missing archive target." };
    }

    await archiveLifeLabItem({
      userId,
      itemKey,
      section,
      itemType: input.itemType,
    });

    revalidateLifeLabArchiveSurfaces(section);

    return { success: true, archived: true, itemKey };
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Could not archive this item." };
  }
}

export async function unarchiveLifeLabItemAction(input: {
  itemKey: string;
  section?: string;
}): Promise<LifeLabArchiveActionResult> {
  try {
    const userId = await requireLifeLabUserId();
    const itemKey = input.itemKey.trim();

    if (!itemKey) {
      return { success: false, error: "Missing archive target." };
    }

    await unarchiveLifeLabItem({ userId, itemKey });

    const section =
      input.section?.trim() || itemKey.split(":")[0] || "flashcards";
    revalidateLifeLabArchiveSurfaces(section);

    return { success: true, archived: false, itemKey };
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Could not unarchive this item." };
  }
}
