const START_SECTION_STORAGE_PREFIX = "life-lab-read-aloud-start:";
const RESUME_SECTION_STORAGE_PREFIX = "life-lab-read-aloud-resume:";

function startSectionKey(fileId: string): string {
  return `${START_SECTION_STORAGE_PREFIX}${fileId}`;
}

function resumeSectionKey(fileId: string): string {
  return `${RESUME_SECTION_STORAGE_PREFIX}${fileId}`;
}

export function readStoredStartSectionId(fileId: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(startSectionKey(fileId));
}

export function writeStoredStartSectionId(
  fileId: string,
  sectionId: string,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(startSectionKey(fileId), sectionId);
}

export function readStoredResumeSectionId(fileId: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(resumeSectionKey(fileId));
}

export function writeStoredResumeSectionId(
  fileId: string,
  sectionId: string,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(resumeSectionKey(fileId), sectionId);
}

export function clearStoredResumeSectionId(fileId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(resumeSectionKey(fileId));
}
