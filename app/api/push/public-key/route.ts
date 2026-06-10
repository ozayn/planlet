import { NextResponse } from "next/server";

import { getWebPushPublicKey, isWebPushConfigured } from "@/lib/env";

export async function GET() {
  if (!isWebPushConfigured()) {
    return NextResponse.json({ enabled: false });
  }

  return NextResponse.json({
    enabled: true,
    publicKey: getWebPushPublicKey(),
  });
}
