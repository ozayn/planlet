"use client";

import { useEffect, useRef, useState } from "react";

type AudioRecorderProps = {
  onTranscript: (transcript: string) => void;
};

type RecorderStatus = "idle" | "recording" | "recorded" | "transcribing";

function getPreferredMimeType(): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/aac",
    "audio/mpeg",
  ];

  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return undefined;
}

export function AudioRecorder({ onTranscript }: AudioRecorderProps) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioBlobRef = useRef<Blob | null>(null);
  const mimeTypeRef = useRef<string>("audio/webm");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function cleanupStream() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }

  function resetRecording() {
    cleanupStream();
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    audioBlobRef.current = null;

    if (playbackUrl) {
      URL.revokeObjectURL(playbackUrl);
    }

    setPlaybackUrl(null);
    setStatus("idle");
    setError(null);
    setSuccess(null);
  }

  useEffect(() => {
    return () => {
      cleanupStream();
      if (playbackUrl) {
        URL.revokeObjectURL(playbackUrl);
      }
    };
  }, [playbackUrl]);

  async function startRecording() {
    setError(null);
    setSuccess(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = getPreferredMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mimeTypeRef.current = recorder.mimeType || mimeType || "audio/webm";
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        audioBlobRef.current = blob;

        if (playbackUrl) {
          URL.revokeObjectURL(playbackUrl);
        }

        const url = URL.createObjectURL(blob);
        setPlaybackUrl(url);
        setStatus("recorded");
        cleanupStream();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus("recording");
    } catch {
      cleanupStream();
      setError("Microphone permission is required to record.");
      setStatus("idle");
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  function playRecording() {
    if (!playbackUrl || !audioRef.current) return;
    void audioRef.current.play();
  }

  async function transcribeRecording() {
    const blob = audioBlobRef.current;

    if (!blob) {
      setError("Record audio before transcribing.");
      return;
    }

    setError(null);
    setSuccess(null);
    setStatus("transcribing");

    const extension = mimeTypeRef.current.includes("mp4")
      ? "m4a"
      : mimeTypeRef.current.includes("mpeg")
        ? "mp3"
        : mimeTypeRef.current.includes("wav")
          ? "wav"
          : "webm";

    const formData = new FormData();
    formData.append("audio", blob, `recording.${extension}`);

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        transcript?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Transcription failed.");
      }

      if (!data.transcript?.trim()) {
        throw new Error("Transcription returned empty text.");
      }

      onTranscript(data.transcript.trim());
      setSuccess("Transcript added. You can edit it before structuring.");
      setStatus("recorded");
    } catch (transcribeError) {
      setError(
        transcribeError instanceof Error
          ? transcribeError.message
          : "Transcription failed.",
      );
      setStatus("recorded");
    }
  }

  const buttonClass =
    "min-h-12 rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 transition-colors hover:border-stone-300 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4">
      <p className="text-sm text-stone-500">
        Farsi, English, or mixed audio is okay.
      </p>

      <div className="flex flex-wrap gap-2">
        {status === "recording" ? (
          <button type="button" onClick={stopRecording} className={buttonClass}>
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            disabled={status === "transcribing"}
            className="min-h-12 rounded-xl bg-stone-900 px-4 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-50"
          >
            Record plan
          </button>
        )}

        {playbackUrl ? (
          <>
            <button
              type="button"
              onClick={playRecording}
              disabled={status === "transcribing"}
              className={buttonClass}
            >
              Play
            </button>
            <button
              type="button"
              onClick={resetRecording}
              disabled={status === "transcribing"}
              className={buttonClass}
            >
              Delete
            </button>
            <button
              type="button"
              onClick={transcribeRecording}
              disabled={status === "transcribing"}
              className="min-h-12 rounded-xl bg-teal-800 px-4 text-sm font-medium text-white transition-colors hover:bg-teal-900 disabled:opacity-50"
            >
              {status === "transcribing" ? "Transcribing…" : "Transcribe"}
            </button>
          </>
        ) : null}
      </div>

      {playbackUrl ? (
        <audio ref={audioRef} src={playbackUrl} className="hidden" preload="metadata" />
      ) : null}

      {status === "recording" ? (
        <p className="text-sm text-teal-800">Recording…</p>
      ) : null}

      {success ? (
        <p className="text-sm text-teal-800">{success}</p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
