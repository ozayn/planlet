/**
 * Profile menu visibility. Therapy thoughts live under Insights, not here.
 * Therapy review appears in the Reflection section when the route ships.
 */
export const PROFILE_MENU_THERAPY_REVIEW_ENABLED = false;

export type ProfileMenuAccess = {
  canGiveFeedback?: boolean;
  canUseTherapyThoughts?: boolean;
  canUseJobTrackerFeatures?: boolean;
  canUseCareerJourneyFeatures?: boolean;
  canUseBodyJourneyFeatures?: boolean;
  canUseCoachingFeatures?: boolean;
  canUseLearningJourneyFeatures?: boolean;
  canUseLifeLabFeatures?: boolean;
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

export function canShowJobTrackerInProfileMenu(
  access: ProfileMenuAccess,
): boolean {
  return Boolean(access.canUseJobTrackerFeatures || access.isAdmin);
}

export function canShowCareerJourneyInProfileMenu(
  access: ProfileMenuAccess,
): boolean {
  return Boolean(access.canUseCareerJourneyFeatures || access.isAdmin);
}

export function canShowBodyJourneyInProfileMenu(
  access: ProfileMenuAccess,
): boolean {
  return Boolean(access.canUseBodyJourneyFeatures || access.isAdmin);
}

export function canShowCoachingInProfileMenu(
  access: ProfileMenuAccess,
): boolean {
  return Boolean(access.canUseCoachingFeatures || access.isAdmin);
}

export function canShowLearningJourneyInProfileMenu(
  access: ProfileMenuAccess,
): boolean {
  return Boolean(access.canUseLearningJourneyFeatures || access.isAdmin);
}

export function canShowLifeLabInProfileMenu(
  access: ProfileMenuAccess,
): boolean {
  return Boolean(access.canUseLifeLabFeatures);
}
