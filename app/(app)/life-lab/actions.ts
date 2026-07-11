"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  fetchFreshLifeLabHome,
  fetchFreshLifeLabNote,
  fetchFreshLifeLabSection,
  refreshLifeLabCache,
  refreshLifeLabNoteCache,
  refreshLifeLabPlaylistCache,
  refreshLifeLabSectionCache,
} from "@/lib/life-lab";
import {
  lifeLabRefreshSuccessMessage,
  toLifeLabRefreshFailureResult,
  type LifeLabRefreshResult,
} from "@/lib/life-lab/cache";
import type { LifeLabSectionId } from "@/lib/life-lab/constants";
import { isPlaylistIndexNote } from "@/lib/life-lab/playlist-index";
import { canAccessLifeLabPage } from "@/lib/roles";

async function requireLifeLabRefreshAccess() {
  const session = await auth();

  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    throw new Error("Not authorized.");
  }

  return session;
}

export async function refreshLifeLabHomeAction(): Promise<LifeLabRefreshResult> {
  try {
    await requireLifeLabRefreshAccess();
    await fetchFreshLifeLabHome();
    refreshLifeLabCache();
    revalidatePath("/life-lab");
    return { ok: true, message: lifeLabRefreshSuccessMessage() };
  } catch {
    return toLifeLabRefreshFailureResult();
  }
}

export async function refreshLifeLabSectionAction(
  sectionId: LifeLabSectionId,
): Promise<LifeLabRefreshResult> {
  try {
    await requireLifeLabRefreshAccess();
    await fetchFreshLifeLabSection(sectionId);
    refreshLifeLabSectionCache(sectionId);
    revalidatePath(`/life-lab/${sectionId}`);
    revalidatePath("/life-lab");
    return { ok: true, message: lifeLabRefreshSuccessMessage() };
  } catch {
    return toLifeLabRefreshFailureResult();
  }
}

export async function refreshLifeLabNoteAction(input: {
  sectionId: LifeLabSectionId;
  slug: string;
  fileId: string;
  metadata?: {
    type?: string;
    playlist?: string;
    source?: string;
  };
  relativePath?: string;
  subfolderLabel?: string | null;
}): Promise<LifeLabRefreshResult> {
  try {
    await requireLifeLabRefreshAccess();
    const note = await fetchFreshLifeLabNote(input.sectionId, input.slug);

    if (!note) {
      throw new Error("Note not found.");
    }

    const isPlaylist = isPlaylistIndexNote({
      sectionId: input.sectionId,
      relativePath: input.relativePath,
      subfolderLabel: input.subfolderLabel,
      metadata: input.metadata,
      content: note.content,
    });

    if (isPlaylist) {
      refreshLifeLabPlaylistCache(input.sectionId, input.slug, input.fileId);
    } else {
      refreshLifeLabNoteCache(input.sectionId, input.slug, input.fileId);
    }

    revalidatePath(`/life-lab/${input.sectionId}/${input.slug}`);
    revalidatePath(`/life-lab/${input.sectionId}`);

    return { ok: true, message: lifeLabRefreshSuccessMessage() };
  } catch {
    return toLifeLabRefreshFailureResult();
  }
}
