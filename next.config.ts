import type { NextConfig } from "next";

import { buildContentSecurityPolicyHeader } from "./lib/security/content-security-policy";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: buildContentSecurityPolicyHeader(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
