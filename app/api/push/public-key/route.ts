import { NextResponse } from "next/server";

import { getWebPushPublicKey, isWebPushConfigured } from "@/lib/env";

export async function GET() {
  if (!isWebPushConfigured()) {
    return NextResponse.json({
      enabled: false,
      reason: "not_configured",
    });
  }

  const publicKey = getWebPushPublicKey();

  if (!publicKey) {
    return NextResponse.json({
      enabled: false,
      reason: "missing_public_key",
    });
  }

  return NextResponse.json({
    enabled: true,
    publicKey,
  });
}
