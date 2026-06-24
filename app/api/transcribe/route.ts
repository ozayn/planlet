import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { transcribeAudio } from "@/lib/ai/transcribe-audio";
import {
  extensionForMimeType,
  MAX_AUDIO_BYTES,
  normalizeAudioMimeType,
} from "@/lib/audio/constants";

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
      { error: "Invalid form data. Send multipart/form-data with an audio file." },
      { status: 400 },
    );
  }

  const audio = formData.get("audio");

  if (!audio || !(audio instanceof File)) {
    return NextResponse.json({ error: "Missing audio file." }, { status: 400 });
  }

  if (audio.size === 0) {
    return NextResponse.json({ error: "Audio file is empty." }, { status: 400 });
  }

  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "Audio file is too large. Maximum size is 20MB." },
      { status: 413 },
    );
  }

  const mimeType = normalizeAudioMimeType(audio.type);

  if (!mimeType) {
    return NextResponse.json(
      {
        error:
          "Unsupported audio type. Use webm, mp4, mpeg, wav, or m4a.",
      },
      { status: 415 },
    );
  }

  try {
    const buffer = Buffer.from(await audio.arrayBuffer());
    const filename =
      audio.name?.trim() ||
      `recording.${extensionForMimeType(mimeType)}`;

    const result = await transcribeAudio({
      buffer,
      filename,
      mimeType,
      userId: session.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Transcription failed.";

    if (message.includes("OPENAI_API_KEY")) {
      return NextResponse.json(
        { error: "Transcription is not configured on the server." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
