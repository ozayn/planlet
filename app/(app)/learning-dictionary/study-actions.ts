"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  isDictionaryStudyStatus,
  type DictionaryStudyStatus,
} from "@/lib/learning-dictionary/study-state";
import { LEARNING_DICTIONARY_SECTION_ID } from "@/lib/learning-dictionary/model";
import { setLifeLabItemStudyStatus } from "@/lib/life-lab/item-state";
import { canAccessLifeLabPage } from "@/lib/roles";
import { SessionExpiredError } from "@/lib/require-auth";

export type DictionaryStudyActionResult =
  | { success: true; itemKey: string; studyStatus: DictionaryStudyStatus }
  | { success: false; error: string };

async function requireDictionaryUserId(): Promise<string> {
  const session = await auth();

  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    throw new SessionExpiredError();
  }

  return session.user.id;
}

export async function setDictionaryStudyStatusAction(input: {
  itemKey: string;
  studyStatus: string;
}): Promise<DictionaryStudyActionResult> {
  try {
    const userId = await requireDictionaryUserId();
    const itemKey = input.itemKey.trim();
    const studyStatus = input.studyStatus.trim().toLowerCase();

    if (!itemKey || !isDictionaryStudyStatus(studyStatus)) {
      return { success: false, error: "Invalid study status." };
    }

    await setLifeLabItemStudyStatus({
      userId,
      itemKey,
      section: LEARNING_DICTIONARY_SECTION_ID,
      itemType: "dictionary-entry",
      studyStatus,
    });

    revalidatePath("/learning-dictionary");
    revalidatePath(`/life-lab/${LEARNING_DICTIONARY_SECTION_ID}`);

    return { success: true, itemKey, studyStatus };
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Could not save study status." };
  }
}
