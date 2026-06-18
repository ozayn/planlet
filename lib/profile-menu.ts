/**
 * Profile menu visibility. Therapy thoughts live under Insights, not here.
 * Therapy review appears in the Reflection section when the route ships.
 */
export const PROFILE_MENU_THERAPY_REVIEW_ENABLED = false;

export type ProfileMenuAccess = {
  canGiveFeedback?: boolean;
  canUseTherapyThoughts?: boolean;
  isAdmin?: boolean;
};

export function canShowTherapyReviewInProfileMenu(
  access: ProfileMenuAccess,
): boolean {
  if (!PROFILE_MENU_THERAPY_REVIEW_ENABLED) {
    return false;
  }

  return Boolean(access.canUseTherapyThoughts || access.isAdmin);
}

export function canShowInsightsInProfileMenu(): boolean {
  return true;
}

export function canShowFeedbackInProfileMenu(
  access: ProfileMenuAccess,
): boolean {
  return Boolean(access.canGiveFeedback || access.isAdmin);
}
