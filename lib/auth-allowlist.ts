/**
 * Server-side email allowlist for Google sign-in.
 * When ALLOWED_EMAILS is unset or empty, all Google accounts are allowed (local dev).
 * Admin emails in PLANLET_ADMIN_EMAILS are always allowed.
 */

function parseEmailList(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }

  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function getAllowedEmails(): string[] {
  return parseEmailList(process.env.ALLOWED_EMAILS);
}

export function getAdminEmails(): string[] {
  return parseEmailList(process.env.PLANLET_ADMIN_EMAILS);
}

export function getReflectorEmails(): string[] {
  return parseEmailList(process.env.PLANLET_REFLECTOR_EMAILS);
}

export function getFeedbackEmails(): string[] {
  return parseEmailList(process.env.PLANLET_FEEDBACK_EMAILS);
}

export function getCoachEmails(): string[] {
  return parseEmailList(process.env.PLANLET_COACH_EMAILS);
}

export function getJobTrackerEmails(): string[] {
  return parseEmailList(process.env.PLANLET_JOB_TRACKER_EMAILS);
}

export function getCareerJourneyEmails(): string[] {
  return parseEmailList(process.env.PLANLET_CAREER_JOURNEY_EMAILS);
}

export function getBodyJourneyEmails(): string[] {
  return parseEmailList(process.env.BODY_JOURNEY_EMAILS);
}

export function getLearningJourneyEmails(): string[] {
  return parseEmailList(process.env.LEARNING_JOURNEY_EMAILS);
}

export function getLifeLabEmails(): string[] {
  return parseEmailList(process.env.LIFE_LAB_EMAILS);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email?.trim()) {
    return false;
  }

  return getAdminEmails().includes(email.trim().toLowerCase());
}

export function isReflectorEmail(email?: string | null): boolean {
  if (!email?.trim()) {
    return false;
  }

  return getReflectorEmails().includes(email.trim().toLowerCase());
}

export function isFeedbackEmail(email?: string | null): boolean {
  if (!email?.trim()) {
    return false;
  }

  return getFeedbackEmails().includes(email.trim().toLowerCase());
}

export function isCoachEmail(email?: string | null): boolean {
  if (!email?.trim()) {
    return false;
  }

  return getCoachEmails().includes(email.trim().toLowerCase());
}

export function isJobTrackerEmail(email?: string | null): boolean {
  if (!email?.trim()) {
    return false;
  }

  return getJobTrackerEmails().includes(email.trim().toLowerCase());
}

export function isCareerJourneyEmail(email?: string | null): boolean {
  if (!email?.trim()) {
    return false;
  }

  return getCareerJourneyEmails().includes(email.trim().toLowerCase());
}

export function isBodyJourneyEmail(email?: string | null): boolean {
  if (!email?.trim()) {
    return false;
  }

  return getBodyJourneyEmails().includes(email.trim().toLowerCase());
}

export function isLearningJourneyEmail(email?: string | null): boolean {
  if (!email?.trim()) {
    return false;
  }

  return getLearningJourneyEmails().includes(email.trim().toLowerCase());
}

export function isLifeLabEmail(email?: string | null): boolean {
  if (!email?.trim()) {
    return false;
  }

  return getLifeLabEmails().includes(email.trim().toLowerCase());
}

export function isEmailAllowed(email?: string | null): boolean {
  if (!email?.trim()) {
    return false;
  }

  const normalized = email.trim().toLowerCase();

  if (isAdminEmail(normalized)) {
    return true;
  }

  const allowed = getAllowedEmails();
  if (allowed.length === 0) {
    return true;
  }

  return allowed.includes(normalized);
}
