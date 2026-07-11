"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type OpenAiNarrationStatus =
  | "idle"
  | "preparing"
  | "generating"
  | "playing"
  | "paused"
  | "cached"
  | "unavailable"
  | "error";

type UseOpenAiNarrationOptions = {
  sectionId: string;
  slug: string;
  driveFileId: string;
  noteTitle: string;
  enabled: boolean;
  playbackRate?: number;
};

type NarrationPlan = {
  chunkCount: number;
  sections: Array<{ index: number; sectionLabel: string }>;
};

export function useOpenAiNarration(options: UseOpenAiNarrationOptions) {
  const [status, setStatus] = useState<OpenAiNarrationStatus>("idle");
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [chunkCount, setChunkCount] = useState(0);
  const [sectionLabel, setSectionLabel] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const planRef = useRef<NarrationPlan | null>(null);
  const playingRef = useRef(false);
  const playbackRateRef = useRef(options.playbackRate ?? 1);

  useEffect(() => {
    playbackRateRef.current = options.playbackRate ?? 1;

    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRateRef.current;
    }
  }, [options.playbackRate]);

  const cleanupObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    playingRef.current = false;
    cleanupObjectUrl();

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }

    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "none";
    }

    setStatus("idle");
    setStatusMessage(null);
    setSectionLabel(null);
    setCurrentChunkIndex(0);
    setFromCache(false);
  }, [cleanupObjectUrl]);

  const updateMediaSession = useCallback(
    (label: string) => {
      if (!("mediaSession" in navigator)) {
        return;
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: options.noteTitle,
        artist: label,
        album: "Life Lab",
      });

      navigator.mediaSession.setActionHandler("play", () => {
        void audioRef.current?.play();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        audioRef.current?.pause();
      });
    },
    [options.noteTitle],
  );

  const fetchPlan = useCallback(async (): Promise<NarrationPlan> => {
    const response = await fetch("/api/life-lab/narration/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionId: options.sectionId,
        slug: options.slug,
      }),
    });

    if (!response.ok) {
      throw new Error("OpenAI narration is unavailable.");
    }

    const plan = (await response.json()) as NarrationPlan;
    planRef.current = plan;
    setChunkCount(plan.chunkCount);
    return plan;
  }, [options.sectionId, options.slug]);

  const fetchChunkAudio = useCallback(
    async (chunkIndex: number, regenerate = false): Promise<{
      blob: Blob;
      sectionLabel: string;
      cached: boolean;
      chunkCount: number;
    }> => {
      const response = await fetch("/api/life-lab/narration/chunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: options.sectionId,
          slug: options.slug,
          chunkIndex,
          regenerate,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Narration generation failed.");
      }

      const blob = await response.blob();
      const cached = response.headers.get("X-Narration-Cache") === "hit";
      const chunkCount = Number.parseInt(
        response.headers.get("X-Narration-Chunk-Count") ?? "0",
        10,
      );
      const encodedLabel = response.headers.get("X-Narration-Section-Label");
      const section =
        encodedLabel != null
          ? decodeURIComponent(encodedLabel)
          : "Section";

      return { blob, sectionLabel: section, cached, chunkCount };
    },
    [options.sectionId, options.slug],
  );

  const playChunk = useCallback(
    async (chunkIndex: number, regenerate = false) => {
      if (!options.enabled) {
        setStatus("unavailable");
        setError("OpenAI narration is unavailable.");
        return;
      }

      setError(null);
      setCurrentChunkIndex(chunkIndex);
      setStatus(chunkIndex === 0 ? "preparing" : "generating");
      setStatusMessage(
        chunkIndex === 0
          ? "Generating first section…"
          : "Preparing narration…",
      );

      const result = await fetchChunkAudio(chunkIndex, regenerate);
      cleanupObjectUrl();
      const objectUrl = URL.createObjectURL(result.blob);
      objectUrlRef.current = objectUrl;

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      const audio = audioRef.current;
      audio.src = objectUrl;
      audio.playbackRate = playbackRateRef.current;
      setChunkCount(result.chunkCount);
      setSectionLabel(result.sectionLabel);
      setFromCache(result.cached);
      setStatus(result.cached ? "cached" : "playing");
      setStatusMessage(
        result.cached ? "Playing cached narration" : "Playing OpenAI narration",
      );
      updateMediaSession(result.sectionLabel);

      await new Promise<void>((resolve, reject) => {
        function handleEnded() {
          cleanupListeners();
          resolve();
        }

        function handleError() {
          cleanupListeners();
          reject(new Error("Audio playback failed."));
        }

        function cleanupListeners() {
          audio.removeEventListener("ended", handleEnded);
          audio.removeEventListener("error", handleError);
        }

        audio.addEventListener("ended", handleEnded);
        audio.addEventListener("error", handleError);
        void audio.play().catch(reject);
      });

      if (!playingRef.current) {
        return;
      }

      const nextIndex = chunkIndex + 1;

      if (nextIndex < result.chunkCount) {
        await playChunk(nextIndex, false);
        return;
      }

      stop();
    },
    [
      cleanupObjectUrl,
      fetchChunkAudio,
      options.enabled,
      stop,
      updateMediaSession,
    ],
  );

  const play = useCallback(
    async (regenerate = false) => {
      if (!options.enabled) {
        setStatus("unavailable");
        setError("OpenAI narration is unavailable.");
        return;
      }

      try {
        playingRef.current = true;
        setStatus("preparing");
        setStatusMessage("Preparing narration…");
        await fetchPlan();
        await playChunk(0, regenerate);
      } catch (caught) {
        playingRef.current = false;
        setStatus("error");
        setError(
          caught instanceof Error
            ? caught.message
            : "OpenAI narration is unavailable.",
        );
        setStatusMessage("Narration unavailable");
      }
    },
    [fetchPlan, options.enabled, playChunk],
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setStatus("paused");
    setStatusMessage("Paused");

    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "paused";
    }
  }, []);

  const resume = useCallback(() => {
    void audioRef.current?.play();
    setStatus(fromCache ? "cached" : "playing");
    setStatusMessage(
      fromCache ? "Playing cached narration" : "Playing OpenAI narration",
    );

    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "playing";
    }
  }, [fromCache]);

  const skipForward = useCallback(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 15);
  }, []);

  const skipBackward = useCallback(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.currentTime = Math.max(0, audio.currentTime - 15);
  }, []);

  const nextSection = useCallback(async () => {
    const plan = planRef.current;
    const nextIndex = currentChunkIndex + 1;

    if (!plan || nextIndex >= plan.chunkCount) {
      return;
    }

    playingRef.current = true;
    audioRef.current?.pause();
    cleanupObjectUrl();
    await playChunk(nextIndex, false);
  }, [cleanupObjectUrl, currentChunkIndex, playChunk]);

  const regenerate = useCallback(async () => {
    await fetch("/api/life-lab/narration/regenerate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driveFileId: options.driveFileId }),
    });

    stop();
    await play(true);
  }, [options.driveFileId, play, stop]);

  useEffect(() => () => {
    playingRef.current = false;
    cleanupObjectUrl();

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
  }, [cleanupObjectUrl]);

  return {
    status,
    statusMessage,
    sectionLabel,
    currentChunkIndex,
    chunkCount,
    fromCache,
    error,
    isPlaying: status === "playing" || status === "cached",
    isPaused: status === "paused",
    play,
    pause,
    resume,
    stop,
    skipForward,
    skipBackward,
    nextSection,
    regenerate,
    switchToDeviceMessage:
      "OpenAI narration is unavailable. Use device voice instead.",
  };
}
