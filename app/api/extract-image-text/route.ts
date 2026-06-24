import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  extractImageText,
  ExtractionTimeoutError,
} from "@/lib/ai/extract-image-text";
import {
  formatFileSize,
  MAX_IMAGE_UPLOAD_BYTES,
  normalizeImageMimeType,
} from "@/lib/image/constants";

const GENERIC_EXTRACTION_FAILURE =
  "Couldn't extract this image cleanly. Try cropping closer to the writing or paste the text manually.";

function friendlyExtractionError(error: unknown): string {
  if (error instanceof ExtractionTimeoutError) {
    return error.message;
  }

  if (!(error instanceof Error)) {
    return GENERIC_EXTRACTION_FAILURE;
  }

  const message = error.message;

  if (message.includes("OPENAI_API_KEY")) {
    return "Image text extraction is not configured on the server.";
  }

  if (
    message.includes("invalid JSON") ||
    message.includes("unexpected shape") ||
    message.includes("No text could be extracted")
  ) {
    return GENERIC_EXTRACTION_FAILURE;
  }

  if (message.includes("too large")) {
    return message;
  }

  return GENERIC_EXTRACTION_FAILURE;
}

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
        error: `Image file is too large after preparation. Maximum size is ${formatFileSize(MAX_IMAGE_UPLOAD_BYTES)}. Try cropping closer to the note.`,
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

    const result = await extractImageText(
      {
        buffer,
        mimeType,
      },
      { userId: session.user.id },
    );

    return NextResponse.json({
      text: result.text,
      language: result.language,
      dateHint: result.dateHint,
      removedHeaderLines: result.removedHeaderLines,
      possibleTitle: result.possibleTitle ?? null,
      itemHints: result.itemHints,
      multipleDateSectionsDetected: result.multipleDateSectionsDetected,
      imperfect: result.imperfect ?? false,
    });
  } catch (error) {
    const message = friendlyExtractionError(error);
    const status =
      error instanceof ExtractionTimeoutError
        ? 504
        : message.includes("not configured")
          ? 503
          : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
