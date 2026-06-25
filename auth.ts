import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";
import { resolveUserAccessFromEmail, syncUserAccessOnSignIn } from "@/lib/auth-roles";
import { trackUserSignInSafely } from "@/lib/login-activity";
import { prisma } from "@/lib/prisma";
import { FALLBACK_TIMEZONE } from "@/lib/user-timezone-constants";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  events: {
    async signIn({ user, account }) {
      await trackUserSignInSafely({
        userId: user.id,
        email: user.email,
        provider: account?.provider,
      });
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, account }) {
      if (user && account) {
        await trackUserSignInSafely({
          userId: user.id,
          email: user.email,
          provider: account.provider,
        });
      }

      if (user) {
        const email = user.email?.trim();

        if (email && user.id) {
          token.id = user.id;

          await syncUserAccessOnSignIn(user.id, email);
        } else if (user.id) {
          token.id = user.id;
        }

        if (user.image) {
          token.picture = user.image;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (!session.user || !token.sub) {
        return session;
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: token.sub },
        select: {
          role: true,
          canGiveFeedback: true,
          canUseReflectionFeatures: true,
          canUseCoachingFeatures: true,
          canUseJobTrackerFeatures: true,
          canUseCareerJourneyFeatures: true,
          canUseBodyJourneyFeatures: true,
          canUseLearningJourneyFeatures: true,
          timezone: true,
          timezoneMode: true,
          image: true,
        },
      });

      if (!dbUser) {
        return { ...session, user: undefined };
      }

      const access = resolveUserAccessFromEmail(session.user.email ?? "", {
        role: dbUser.role,
        canGiveFeedback: dbUser.canGiveFeedback,
        canUseReflectionFeatures: dbUser.canUseReflectionFeatures,
        canUseCoachingFeatures: dbUser.canUseCoachingFeatures,
        canUseJobTrackerFeatures: dbUser.canUseJobTrackerFeatures,
        canUseCareerJourneyFeatures: dbUser.canUseCareerJourneyFeatures,
        canUseBodyJourneyFeatures: dbUser.canUseBodyJourneyFeatures,
        canUseLearningJourneyFeatures: dbUser.canUseLearningJourneyFeatures,
      });

      session.user.id = token.sub;
      session.user.role = access.role;
      session.user.canGiveFeedback = access.canGiveFeedback;
      session.user.canUseReflectionFeatures = access.canUseReflectionFeatures;
      session.user.canUseCoachingFeatures = access.canUseCoachingFeatures;
      session.user.canUseJobTrackerFeatures = access.canUseJobTrackerFeatures;
      session.user.canUseCareerJourneyFeatures =
        access.canUseCareerJourneyFeatures;
      session.user.canUseBodyJourneyFeatures = access.canUseBodyJourneyFeatures;
      session.user.canUseLearningJourneyFeatures =
        access.canUseLearningJourneyFeatures;
      session.user.timezone = dbUser.timezone ?? FALLBACK_TIMEZONE;
      session.user.timezoneMode = dbUser.timezoneMode;
      session.user.image = dbUser.image ?? session.user.image ?? null;

      return session;
    },
  },
});
