import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";
import { syncUserRoleOnSignIn } from "@/lib/auth-roles";
import { trackUserSignInSafely } from "@/lib/login-activity";
import { prisma } from "@/lib/prisma";

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

          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true },
          });

          token.role =
            dbUser?.role ?? (await syncUserRoleOnSignIn(user.id, email));
        } else if (user.id) {
          token.id = user.id;
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true },
          });
          token.role = dbUser?.role ?? "USER";
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role =
          (token.role as "USER" | "ADMIN" | undefined) ?? "USER";
      }
      return session;
    },
  },
});
