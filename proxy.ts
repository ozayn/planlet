import { NextResponse } from "next/server";

import { auth } from "@/auth";

const protectedPrefixes = [
  "/dashboard",
  "/today",
  "/plans",
  "/insights",
  "/settings",
  "/admin",
];

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !req.auth?.user) {
    const signInUrl = new URL("/", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/today/:path*",
    "/plans/:path*",
    "/insights/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};
