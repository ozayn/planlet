/**
 * Life Lab note learning-mode tabs.
 * Flip `LIFE_LAB_NOTE_COACHING_TAB_ENABLED` to re-show Coaching on note pages
 * without rebuilding the mode-tab UI.
 */
export const LIFE_LAB_NOTE_COACHING_TAB_ENABLED = false;

export function isLifeLabNoteCoachingTabEnabled(): boolean {
  return LIFE_LAB_NOTE_COACHING_TAB_ENABLED;
}
