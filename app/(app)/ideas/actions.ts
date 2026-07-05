"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  createIdea,
  deleteIdea,
  IdeasError,
  updateIdea,
  type CreateIdeaInput,
  type UpdateIdeaInput,
} from "@/lib/ideas";
import { canUseIdeasFeatures } from "@/lib/roles";

export type IdeasActionResult =
  | { success: true }
  | { success: false; error: string };

async function requireIdeasSession() {
  const session = await auth();
  if (!session?.user?.id || !canUseIdeasFeatures(session.user)) {
    throw new IdeasError("Not authorized.");
  }
  return session;
}

function revalidateIdeas() {
  revalidatePath("/ideas");
}

export async function createIdeaAction(
  input: CreateIdeaInput,
): Promise<IdeasActionResult> {
  try {
    const session = await requireIdeasSession();
    await createIdea(session.user.id, input);
    revalidateIdeas();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof IdeasError ? error.message : "Failed to save idea.",
    };
  }
}

export async function updateIdeaAction(
  ideaId: string,
  input: UpdateIdeaInput,
): Promise<IdeasActionResult> {
  try {
    const session = await requireIdeasSession();
    await updateIdea(session.user.id, ideaId, input);
    revalidateIdeas();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof IdeasError ? error.message : "Failed to update idea.",
    };
  }
}

export async function deleteIdeaAction(
  ideaId: string,
): Promise<IdeasActionResult> {
  try {
    const session = await requireIdeasSession();
    await deleteIdea(session.user.id, ideaId);
    revalidateIdeas();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof IdeasError ? error.message : "Failed to delete idea.",
    };
  }
}
