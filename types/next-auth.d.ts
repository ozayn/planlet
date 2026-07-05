import type { TimezoneMode, UserRole } from "@/app/generated/prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
      canGiveFeedback: boolean;
      canUseReflectionFeatures: boolean;
      canUseCoachingFeatures: boolean;
      canUseJobTrackerFeatures: boolean;
      canUseCareerJourneyFeatures: boolean;
      canUseBodyJourneyFeatures: boolean;
      canUseLearningJourneyFeatures: boolean;
      canUseLifeLabFeatures: boolean;
      canUseIdeasFeatures: boolean;
      timezone: string;
      timezoneMode: TimezoneMode;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
  }
}
