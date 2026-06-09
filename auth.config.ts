import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

import { isEmailAllowed } from "@/lib/auth-allowlist";

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
  callbacks: {
    async signIn({ user, profile }) {
      const email = user.email ?? profile?.email;
      return isEmailAllowed(email);
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
