import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getLifeLabDiagramAsset } from "@/lib/life-lab";
import { canAccessLifeLabPage } from "@/lib/roles";

const DIAGRAM_FORMATS = new Set(["png", "svg", "mmd"]);

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const section = url.searchParams.get("section") ?? "";
  const slug = url.searchParams.get("slug") ?? "";
  const name = url.searchParams.get("name") ?? "";
  const format = url.searchParams.get("format") ?? "";

  if (!name || !DIAGRAM_FORMATS.has(format)) {
    return NextResponse.json(
      { error: "invalid_diagram_asset_request" },
      { status: 400 },
    );
  }

  const asset = await getLifeLabDiagramAsset(
    section,
    slug,
    name,
    format as "png" | "svg" | "mmd",
  );

  if (!asset) {
    return NextResponse.json(
      {
        error: "diagram_asset_not_found",
        fallback: "client_export",
      },
      {
        status: 404,
        headers: {
          "Cache-Control": "private, max-age=60",
        },
      },
    );
  }

  const body = new ArrayBuffer(asset.bytes.byteLength);
  new Uint8Array(body).set(asset.bytes);

  return new NextResponse(body, {
    headers: {
      "Content-Type": asset.contentType,
      "Content-Disposition": `inline; filename="${asset.filename}"`,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
