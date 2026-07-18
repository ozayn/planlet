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
  const name = url.searchParams.get("name") ?? "diagram";
  const format = url.searchParams.get("format") ?? "";

  if (!DIAGRAM_FORMATS.has(format)) {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }

  const asset = await getLifeLabDiagramAsset(
    section,
    slug,
    name,
    format as "png" | "svg" | "mmd",
  );

  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
