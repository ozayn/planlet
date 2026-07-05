import {
  LIFE_LAB_ALLOWED_SECTIONS,
  LIFE_LAB_BLOCKED_SECTION_IDS,
  type LifeLabSectionId,
} from "@/lib/life-lab/constants";

export function isLifeLabSectionBlocked(sectionId: string): boolean {
  return (LIFE_LAB_BLOCKED_SECTION_IDS as readonly string[]).includes(
    sectionId,
  );
}

export function isLifeLabSectionId(
  sectionId: string,
): sectionId is LifeLabSectionId {
  return sectionId in LIFE_LAB_ALLOWED_SECTIONS;
}

export function getLifeLabSectionLabel(sectionId: LifeLabSectionId): string {
  return LIFE_LAB_ALLOWED_SECTIONS[sectionId].label;
}

export function getLifeLabSectionFolderName(
  sectionId: LifeLabSectionId,
): string {
  return LIFE_LAB_ALLOWED_SECTIONS[sectionId].folderName;
}

export function getAllowedLifeLabSectionIds(): LifeLabSectionId[] {
  return Object.keys(LIFE_LAB_ALLOWED_SECTIONS) as LifeLabSectionId[];
}

export function isAllowedLifeLabFolderName(
  folderName: string,
): folderName is (typeof LIFE_LAB_ALLOWED_SECTIONS)[LifeLabSectionId]["folderName"] {
  return getAllowedLifeLabSectionIds().some(
    (sectionId) =>
      LIFE_LAB_ALLOWED_SECTIONS[sectionId].folderName === folderName,
  );
}

export function sectionIdFromFolderName(
  folderName: string,
): LifeLabSectionId | null {
  for (const sectionId of getAllowedLifeLabSectionIds()) {
    if (LIFE_LAB_ALLOWED_SECTIONS[sectionId].folderName === folderName) {
      return sectionId;
    }
  }

  return null;
}
