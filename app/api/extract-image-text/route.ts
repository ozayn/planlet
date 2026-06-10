import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { extractImageText } from "@/lib/ai/extract-image-text";
import {
  extensionForImageMimeType,
  formatFileSize,
  MAX_IMAGE_UPLOAD_BYTES,
  normalizeImageMimeType,
} from "@/lib/image/constants";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data. Send multipart/form-data with an image file." },
      { status: 400 },
    );
  }

  const image = formData.get("image");

  if (!image || !(image instanceof File)) {
    return NextResponse.json({ error: "Missing image file." }, { status: 400 });
  }

  if (image.size === 0) {
    return NextResponse.json({ error: "Image file is empty." }, { status: 400 });
  }

  if (image.size > MAX_IMAGE_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: `Image file is too large. Maximum size is ${formatFileSize(MAX_IMAGE_UPLOAD_BYTES)}.`,
      },
      { status: 413 },
    );
  }

  const mimeType = normalizeImageMimeType(image.type);

  if (!mimeType) {
    return NextResponse.json(
      {
        error:
          "Unsupported image type. Use JPEG, PNG, or WebP. HEIC/HEIF may not be supported by your browser or server.",
      },
      { status: 415 },
    );
  }

  try {
    const buffer = Buffer.from(await image.arrayBuffer());
    const filename =
      image.name?.trim() ||
      `notebook.${extensionForImageMimeType(mimeType)}`;

    const result = await extractImageText({
      buffer,
      mimeType,
    });

    return NextResponse.json({
      text: result.text,
      language: result.language,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Text extraction failed.";

    if (message.includes("OPENAI_API_KEY")) {
      return NextResponse.json(
        { error: "Image text extraction is not configured on the server." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
