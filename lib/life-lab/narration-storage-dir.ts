export function getNarrationStorageDir(): string {
  return (
    process.env.LIFE_LAB_NARRATION_STORAGE_DIR?.trim() ||
    `${process.cwd()}/.data/life-lab-narration`
  );
}
