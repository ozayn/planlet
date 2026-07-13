import {
  readStoredResumeSectionId as readStoredResumeSectionIdGeneric,
  readStoredStartSectionId as readStoredStartSectionIdGeneric,
  writeStoredResumeSectionId as writeStoredResumeSectionIdGeneric,
  writeStoredStartSectionId as writeStoredStartSectionIdGeneric,
} from "@/lib/read-aloud/session-storage";

const COACHING_READ_ALOUD_SESSION_PREFIX = "coaching-read-aloud";

export function readStoredStartSectionId(contentHash: string): string | null {
  return readStoredStartSectionIdGeneric(
    COACHING_READ_ALOUD_SESSION_PREFIX,
    contentHash,
  );
}

export function writeStoredStartSectionId(
  contentHash: string,
  sectionId: string,
): void {
  writeStoredStartSectionIdGeneric(
    COACHING_READ_ALOUD_SESSION_PREFIX,
    contentHash,
    sectionId,
  );
}

export function readStoredResumeSectionId(contentHash: string): string | null {
  return readStoredResumeSectionIdGeneric(
    COACHING_READ_ALOUD_SESSION_PREFIX,
    contentHash,
  );
}

export function writeStoredResumeSectionId(
  contentHash: string,
  sectionId: string,
): void {
  writeStoredResumeSectionIdGeneric(
    COACHING_READ_ALOUD_SESSION_PREFIX,
    contentHash,
    sectionId,
  );
}
