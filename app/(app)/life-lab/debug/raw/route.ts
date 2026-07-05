import { notFound } from "next/navigation";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getLifeLabRawMarkdown } from "@/lib/life-lab";
import { isLifeLabDevToolsEnabled } from "@/lib/life-lab/dev";
import { canAccessLifeLabPage } from "@/lib/roles";

export async function GET(request: Request) {
  if (!isLifeLabDevToolsEnabled()) {
    notFound();
  }

  const session = await auth();

  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sectionId = searchParams.get("section")?.trim();
  const slug = searchParams.get("slug")?.trim();

  if (!sectionId || !slug) {
    return new NextResponse("Missing section or slug.", { status: 400 });
  }

  const result = await getLifeLabRawMarkdown(sectionId, slug);

  if (!result) {
    return new NextResponse("Note not found.", { status: 404 });
  }

  return new NextResponse(result.content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
