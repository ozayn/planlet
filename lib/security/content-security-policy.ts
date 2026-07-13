/**
 * Content Security Policy for Planlet.
 *
 * Development includes 'unsafe-eval' because React dev tooling uses eval for
 * enhanced debugging (e.g. server stack traces in the browser). Production does
 * not include it — neither React nor Next.js use eval in production builds.
 *
 * @see node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md
 */
export function buildContentSecurityPolicyHeader(
  nodeEnv = process.env.NODE_ENV,
): string {
  const isDev = nodeEnv === "development";

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://*.googleusercontent.com https://i.ytimg.com https://img.youtube.com",
    "media-src 'self' blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  if (!isDev) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}
