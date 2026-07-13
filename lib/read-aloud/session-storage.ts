function startSectionKey(prefix: string, scopeId: string): string {
  return `${prefix}:start:${scopeId}`;
}

function resumeSectionKey(prefix: string, scopeId: string): string {
  return `${prefix}:resume:${scopeId}`;
}

export function readStoredStartSectionId(
  prefix: string,
  scopeId: string,
): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(startSectionKey(prefix, scopeId));
}

export function writeStoredStartSectionId(
  prefix: string,
  scopeId: string,
  sectionId: string,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(startSectionKey(prefix, scopeId), sectionId);
}

export function readStoredResumeSectionId(
  prefix: string,
  scopeId: string,
): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(resumeSectionKey(prefix, scopeId));
}

export function writeStoredResumeSectionId(
  prefix: string,
  scopeId: string,
  sectionId: string,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(resumeSectionKey(prefix, scopeId), sectionId);
}

export function clearStoredResumeSectionId(
  prefix: string,
  scopeId: string,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(resumeSectionKey(prefix, scopeId));
}
