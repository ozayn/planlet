"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getNarrationUserMessage,
  type NarrationErrorCategory,
} from "@/lib/life-lab/narration-errors";
import { buildSameOriginNarrationChunkUrl } from "@/lib/life-lab/narration-audio-source";
import {
  getFirstChunkIndexForSectionId,
  getNextChunkIndexFromRanges,
  getNextSectionFirstChunkIndex,
  getPreviousSectionFirstChunkIndex,
  type ReadAloudPlaybackOptions,
} from "@/lib/life-lab/read-aloud-navigation";
import type { ReadAloudSectionChunkRange } from "@/lib/life-lab/narration-chunks";
import {
  isNarrationChunkCompatible,
  logNarrationConfigurationMismatch,
  parseOpenAiNarrationSessionConfig,
  serializeNarrationSessionConfig,
  type OpenAiNarrationSessionConfig,
} from "@/lib/life-lab/narration-session";
import {
  buildPlaybackDiagnostic,
  categorizePlaybackFailure,
  clearAudioSource,
  createNarrationObjectUrl,
  logNarrationPlaybackDiagnostic,
  looksLikeMp3,
  normalizeNarrationAudioBlob,
  replaceAudioObjectUrl,
  validateNarrationAudioBlob,
  waitForAudioCanPlay,
} from "@/lib/life-lab/narration-playback";

type OpenAiNarrationStatus =
  | "idle"
  | "preparing"
  | "generating"
  | "ready"
  | "playing"
  | "paused"
  | "cached"
  | "finished"
  | "unavailable"
  | "error";

type OpenAiNarrationApiConfig = {
  planUrl: string;
  chunkUrl: string;
  regenerateUrl?: string;
  mediaSessionTitle: string;
  mediaSessionAlbum?: string;
  buildPlanBody: () => Record<string, unknown>;
  buildChunkBody: (
    chunkIndex: number,
    regenerate: boolean,
  ) => Record<string, unknown>;
  buildRegenerateBody?: () => Record<string, unknown>;
  buildSameOriginChunkUrl?: (chunkIndex: number) => string;
};

type UseOpenAiNarrationOptions = {
  sectionId?: string;
  slug?: string;
  driveFileId?: string;
  noteTitle?: string;
  api?: OpenAiNarrationApiConfig;
  mediaSessionAlbum?: string;
  enabled: boolean;
  playbackRate?: number;
  autoContinue?: boolean;
  onSectionChange?: (sectionId: string | null) => void;
};

type NarrationPlanSection = ReadAloudSectionChunkRange;

type NarrationPlan = {
  chunkCount: number;
  sectionCount: number;
  openAiAvailable?: boolean;
  sessionConfig?: OpenAiNarrationSessionConfig | null;
  unavailable?: {
    error: string;
    category: NarrationErrorCategory;
    debugMessage?: string;
  };
  sections: NarrationPlanSection[];
};

type NarrationErrorResponse = {
  error: string;
  category?: NarrationErrorCategory;
  debugMessage?: string;
};

type ChunkAudioResult = {
  blob: Blob;
  sectionLabel: string;
  cached: boolean;
  chunkCount: number;
  cacheWriteFailed: boolean;
  responseContentType: string | null;
};

async function readNarrationError(response: Response): Promise<NarrationErrorResponse> {
  const payload = (await response.json().catch(() => null)) as
    | NarrationErrorResponse
    | null;

  return {
    error: payload?.error ?? "OpenAI narration is unavailable.",
    category: payload?.category,
    debugMessage: payload?.debugMessage,
  };
}

function resolveOpenAiNarrationApi(
  options: UseOpenAiNarrationOptions,
): OpenAiNarrationApiConfig {
  if (options.api) {
    return options.api;
  }

  const sectionId = options.sectionId?.trim() ?? "";
  const slug = options.slug?.trim() ?? "";
  const noteTitle = options.noteTitle?.trim() || "Planlet";
  const driveFileId = options.driveFileId?.trim() ?? "";

  return {
    planUrl: "/api/life-lab/narration/plan",
    chunkUrl: "/api/life-lab/narration/chunk",
    regenerateUrl: "/api/life-lab/narration/regenerate",
    mediaSessionTitle: noteTitle,
    mediaSessionAlbum: options.mediaSessionAlbum ?? "Life Lab",
    buildPlanBody: () => ({ sectionId, slug }),
    buildChunkBody: (chunkIndex, regenerate) => ({
      sectionId,
      slug,
      chunkIndex,
      regenerate,
    }),
    buildRegenerateBody: () => ({ driveFileId }),
    buildSameOriginChunkUrl: (chunkIndex) =>
      buildSameOriginNarrationChunkUrl({
        sectionId,
        slug,
        chunkIndex,
      }),
  };
}

export function useOpenAiNarration(options: UseOpenAiNarrationOptions) {
  const api = resolveOpenAiNarrationApi(options);
  const [status, setStatus] = useState<OpenAiNarrationStatus>("idle");
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [chunkCount, setChunkCount] = useState(0);
  const [sectionLabel, setSectionLabel] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCategory, setErrorCategory] = useState<NarrationErrorCategory | null>(
    null,
  );
  const [debugMessage, setDebugMessage] = useState<string | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [sectionCount, setSectionCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const planRef = useRef<NarrationPlan | null>(null);
  const sessionConfigRef = useRef<OpenAiNarrationSessionConfig | null>(null);
  const playbackOptionsRef = useRef<ReadAloudPlaybackOptions>({
    autoContinue: options.autoContinue ?? true,
    playOnlySection: false,
  });
  const playingRef = useRef(false);
  const playbackRateRef = useRef(options.playbackRate ?? 1);
  const chunkEndedResolverRef = useRef<(() => void) | null>(null);
  const chunkEndedRejecterRef = useRef<((error: unknown) => void) | null>(null);

  useEffect(() => {
    playbackRateRef.current = options.playbackRate ?? 1;

    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRateRef.current;
    }
  }, [options.playbackRate]);

  useEffect(() => {
    playbackOptionsRef.current.autoContinue = options.autoContinue ?? true;
  }, [options.autoContinue]);

  const notifySectionChange = useCallback(
    (sectionId: string | null) => {
      options.onSectionChange?.(sectionId);
    },
    [options.onSectionChange],
  );

  const ensureAudioElement = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";

      audioRef.current.addEventListener("ended", () => {
        chunkEndedResolverRef.current?.();
      });

      audioRef.current.addEventListener("error", () => {
        const audio = audioRef.current;

        if (!audio) {
          return;
        }

        chunkEndedRejecterRef.current?.(audio.error ?? new Error("Audio playback failed."));
      });
    }

    return audioRef.current;
  }, []);

  const clearAudio = useCallback(() => {
    clearAudioSource({
      audio: audioRef.current,
      activeUrlRef: objectUrlRef,
    });
  }, []);

  const setFailure = useCallback(
    (
      message: string,
      category: NarrationErrorCategory | null = null,
      debug?: string | null,
    ) => {
      playingRef.current = false;
      setNeedsUserGesture(false);
      setStatus("error");
      setError(message);
      setErrorCategory(category);
      setDebugMessage(debug ?? null);
      setStatusMessage("Narration unavailable");
    },
    [],
  );

  const stop = useCallback(() => {
    playingRef.current = false;
    setNeedsUserGesture(false);
    clearAudio();

    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "none";
    }

    setStatus("idle");
    setStatusMessage(null);
    setSectionLabel(null);
    setCurrentChunkIndex(0);
    setFromCache(false);
    setError(null);
    setErrorCategory(null);
    setDebugMessage(null);
  }, [clearAudio]);

  const updateMediaSession = useCallback(
    (label: string) => {
      if (!("mediaSession" in navigator)) {
        return;
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: api.mediaSessionTitle,
        artist: label,
        album: api.mediaSessionAlbum ?? "Planlet",
      });

      navigator.mediaSession.setActionHandler("play", () => {
        void audioRef.current?.play();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        audioRef.current?.pause();
      });
    },
    [api.mediaSessionAlbum, api.mediaSessionTitle],
  );

  const fetchPlan = useCallback(async (): Promise<NarrationPlan> => {
    const response = await fetch(api.planUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(api.buildPlanBody()),
    });

    if (!response.ok) {
      const payload = await readNarrationError(response);
      throw Object.assign(new Error(payload.error), {
        category: payload.category ?? "unknown",
        debugMessage: payload.debugMessage,
      });
    }

    const raw = (await response.json()) as Omit<NarrationPlan, "sections"> & {
      sections: Array<{
        id: string;
        title: string;
        order: number;
        sectionIndex: number;
        firstChunkIndex: number;
        chunkCount: number;
      }>;
      sessionConfig?: unknown;
    };

    const sessionConfig = parseOpenAiNarrationSessionConfig(raw.sessionConfig);

    const plan: NarrationPlan = {
      chunkCount: raw.chunkCount,
      sectionCount: raw.sectionCount,
      openAiAvailable: raw.openAiAvailable,
      sessionConfig,
      unavailable: raw.unavailable,
      sections: raw.sections.map((section) => ({
        sectionId: section.id,
        sectionTitle: section.title,
        sectionOrder: section.order,
        sectionIndex: section.sectionIndex,
        firstChunkIndex: section.firstChunkIndex,
        chunkCount: section.chunkCount,
      })),
    };

    if (plan.openAiAvailable === false && plan.unavailable) {
      throw Object.assign(new Error(plan.unavailable.error), {
        category: plan.unavailable.category,
        debugMessage: plan.unavailable.debugMessage,
      });
    }

    // New Listen start resolves and locks one session config for all chunks.
    sessionConfigRef.current = sessionConfig;
    planRef.current = plan;
    setChunkCount(plan.chunkCount);
    setSectionCount(plan.sectionCount);
    return plan;
  }, [api]);

  const readChunkSessionMetadata = (
    headers: Headers,
  ): {
    model: string | null;
    voice: string | null;
    narrationStyle: string | null;
    instructionsFingerprint: string | null;
    instructionVersion: number | null;
    contentProfile: string | null;
    sessionId: string | null;
  } => {
    const instructionVersionRaw = headers.get("X-Narration-Instruction-Version");
    const instructionVersion = instructionVersionRaw
      ? Number.parseInt(instructionVersionRaw, 10)
      : Number.NaN;

    return {
      model: headers.get("X-Narration-Model"),
      voice: headers.get("X-Narration-Voice"),
      narrationStyle: headers.get("X-Narration-Style"),
      instructionsFingerprint: headers.get("X-Narration-Instructions-Fingerprint"),
      instructionVersion: Number.isInteger(instructionVersion)
        ? instructionVersion
        : null,
      contentProfile: headers.get("X-Narration-Content-Profile"),
      sessionId: headers.get("X-Narration-Session-Id"),
    };
  };

  const fetchChunkAudio = useCallback(
    async (chunkIndex: number, regenerate = false): Promise<ChunkAudioResult> => {
      const sessionConfig = sessionConfigRef.current;
      const requestBody = {
        ...api.buildChunkBody(chunkIndex, regenerate),
        ...(sessionConfig
          ? { sessionConfig: serializeNarrationSessionConfig(sessionConfig) }
          : {}),
      };

      const response = await fetch(api.chunkUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const responseContentType = response.headers.get("Content-Type");

      if (!response.ok) {
        const payload = await readNarrationError(response);
        throw Object.assign(new Error(payload.error), {
          category: payload.category ?? "unknown",
          debugMessage: payload.debugMessage,
        });
      }

      if (responseContentType?.includes("application/json")) {
        const payload = await readNarrationError(response);
        throw Object.assign(new Error(payload.error), {
          category: payload.category ?? "unknown",
          debugMessage: payload.debugMessage,
        });
      }

      if (sessionConfig) {
        const received = readChunkSessionMetadata(response.headers);
        const compatible = isNarrationChunkCompatible(
          {
            model: received.model,
            voice: received.voice,
            narrationStyle: received.narrationStyle,
            instructionsFingerprint: received.instructionsFingerprint,
            instructionVersion: received.instructionVersion,
            contentProfile: received.contentProfile,
          },
          sessionConfig,
        );

        if (!compatible) {
          logNarrationConfigurationMismatch({
            sessionId: sessionConfig.sessionId,
            chunkIndex,
            expected: sessionConfig,
            received,
          });

          if (!regenerate) {
            return fetchChunkAudio(chunkIndex, true);
          }

          throw Object.assign(
            new Error(
              "Narration returned a different voice or style than this session. Try again.",
            ),
            { category: "unknown" as NarrationErrorCategory },
          );
        }
      }

      const rawBlob = await response.blob();
      const blob = normalizeNarrationAudioBlob(rawBlob, responseContentType);
      const validationError = validateNarrationAudioBlob(blob, responseContentType);

      if (validationError) {
        throw Object.assign(new Error(getNarrationUserMessage(validationError)), {
          category: validationError,
        });
      }

      const sample = new Uint8Array(await blob.slice(0, 4).arrayBuffer());

      if (!looksLikeMp3(sample) && process.env.NODE_ENV === "development") {
        logNarrationPlaybackDiagnostic("unexpected audio header", {
          errorName: "InvalidMp3Header",
          errorMessage: "Audio bytes do not look like MP3.",
          srcKind: "none",
          sourceScheme: "empty",
          sourceLength: 0,
          sourceOrigin: "unknown",
          sanitizedTransformed: false,
          srcEqualsOriginal: true,
          currentSrc: null,
          responseStatus: response.status,
          responseContentType,
          byteLength: blob.size,
          readyState: null,
          networkState: null,
          mediaErrorCode: null,
          mediaErrorMessage: null,
          playRejected: false,
          playRejectionName: null,
          playRejectionMessage: null,
          fromCache: response.headers.get("X-Narration-Cache") === "hit",
          chunkIndex,
          chunkSource:
            response.headers.get("X-Narration-Cache") === "hit" ? "cache" : "fresh",
        });
      }

      const cached = response.headers.get("X-Narration-Cache") === "hit";
      const cacheWriteFailed =
        response.headers.get("X-Narration-Cache-Write") === "failed";
      const chunkCount = Number.parseInt(
        response.headers.get("X-Narration-Chunk-Count") ?? "0",
        10,
      );
      const encodedLabel = response.headers.get("X-Narration-Section-Label");
      const section =
        encodedLabel != null
          ? decodeURIComponent(encodedLabel)
          : api.mediaSessionTitle;

      logNarrationPlaybackDiagnostic("chunk received", {
        errorName: null,
        errorMessage: null,
        srcKind: "none",
        sourceScheme: "empty",
        sourceLength: 0,
        sourceOrigin: cached ? "cached_blob" : "fresh_blob",
        sanitizedTransformed: false,
        srcEqualsOriginal: true,
        currentSrc: null,
        responseStatus: response.status,
        responseContentType,
        byteLength: blob.size,
        readyState: null,
        networkState: null,
        mediaErrorCode: null,
        mediaErrorMessage: null,
        playRejected: false,
        playRejectionName: null,
        playRejectionMessage: null,
        fromCache: cached,
        chunkIndex,
        chunkSource: cached ? "cache" : "fresh",
      });

      return {
        blob,
        sectionLabel: section,
        cached,
        chunkCount,
        cacheWriteFailed,
        responseContentType,
      };
    },
    [api],
  );

  const waitForChunkEnded = useCallback((audio: HTMLAudioElement) => {
    return new Promise<void>((resolve, reject) => {
      chunkEndedResolverRef.current = () => {
        chunkEndedResolverRef.current = null;
        chunkEndedRejecterRef.current = null;
        resolve();
      };
      chunkEndedRejecterRef.current = (playbackError) => {
        chunkEndedResolverRef.current = null;
        chunkEndedRejecterRef.current = null;
        reject(playbackError);
      };

      if (audio.ended) {
        chunkEndedResolverRef.current();
      }
    });
  }, []);

  const attemptPlaybackWithSource = useCallback(
    async (input: {
      audio: HTMLAudioElement;
      blob: Blob;
      chunkIndex: number;
      result: ChunkAudioResult;
      source: string;
      sourceOrigin: "fresh_blob" | "cached_blob" | "same_origin_route";
    }): Promise<"playing" | "requires_gesture"> => {
      replaceAudioObjectUrl({
        audio: input.audio,
        nextUrl: input.source,
        activeUrlRef: objectUrlRef,
        pageOrigin: typeof window !== "undefined" ? window.location.origin : undefined,
      });
      input.audio.playbackRate = playbackRateRef.current;

      try {
        await waitForAudioCanPlay(input.audio);
      } catch (loadError) {
        const category = categorizePlaybackFailure({
          mediaError: input.audio.error,
          blobSize: input.blob.size,
          sourceUrl: input.source,
        });
        const diagnostic = buildPlaybackDiagnostic({
          audio: input.audio,
          blob: input.blob,
          responseStatus: 200,
          responseContentType: input.result.responseContentType,
          fromCache: input.result.cached,
          chunkIndex: input.chunkIndex,
          playError: loadError,
          playRejected: true,
          assignedSource: input.source,
          sourceOrigin: input.sourceOrigin,
        });

        logNarrationPlaybackDiagnostic("audio load failed", diagnostic);

        throw Object.assign(new Error(getNarrationUserMessage(category)), {
          category,
          debugMessage: diagnostic.mediaErrorMessage ?? diagnostic.errorMessage,
          fromCache: input.result.cached,
          sourceUrl: input.source,
        });
      }

      try {
        await input.audio.play();
      } catch (playError) {
        const category = categorizePlaybackFailure({
          playError,
          mediaError: input.audio.error,
          blobSize: input.blob.size,
          sourceUrl: input.source,
        });
        const diagnostic = buildPlaybackDiagnostic({
          audio: input.audio,
          blob: input.blob,
          responseStatus: 200,
          responseContentType: input.result.responseContentType,
          fromCache: input.result.cached,
          chunkIndex: input.chunkIndex,
          playError,
          playRejected: true,
          assignedSource: input.source,
          sourceOrigin: input.sourceOrigin,
        });

        logNarrationPlaybackDiagnostic("audio.play rejected", diagnostic);

        if (category === "playback_requires_user_gesture") {
          return "requires_gesture";
        }

        throw Object.assign(new Error(getNarrationUserMessage(category)), {
          category,
          debugMessage: diagnostic.playRejectionMessage ?? diagnostic.errorMessage,
          fromCache: input.result.cached,
          sourceUrl: input.source,
        });
      }

      logNarrationPlaybackDiagnostic(
        "audio.play started",
        buildPlaybackDiagnostic({
          audio: input.audio,
          blob: input.blob,
          responseStatus: 200,
          responseContentType: input.result.responseContentType,
          fromCache: input.result.cached,
          chunkIndex: input.chunkIndex,
          playRejected: false,
          assignedSource: input.source,
          sourceOrigin: input.sourceOrigin,
        }),
      );

      return "playing";
    },
    [],
  );

  const attemptPlayback = useCallback(
    async (input: {
      audio: HTMLAudioElement;
      blob: Blob;
      chunkIndex: number;
      result: ChunkAudioResult;
    }): Promise<"playing" | "requires_gesture"> => {
      const blobSourceOrigin = input.result.cached ? "cached_blob" : "fresh_blob";
      const objectUrl = createNarrationObjectUrl(input.blob);

      try {
        return await attemptPlaybackWithSource({
          ...input,
          source: objectUrl,
          sourceOrigin: blobSourceOrigin,
        });
      } catch (firstError) {
        const firstCategory =
          typeof firstError === "object" &&
          firstError != null &&
          "category" in firstError &&
          typeof firstError.category === "string"
            ? (firstError.category as NarrationErrorCategory)
            : null;

        const shouldFallback =
          firstCategory === "audio_csp_blocked" ||
          firstCategory === "blocked_blob_url" ||
          firstCategory === "unsupported_audio_source";

        if (!shouldFallback) {
          throw firstError;
        }

        const sameOriginUrl = api.buildSameOriginChunkUrl?.(input.chunkIndex);

        if (!sameOriginUrl) {
          throw firstError;
        }

        logNarrationPlaybackDiagnostic("falling back to same-origin audio route", {
          errorName: firstError instanceof Error ? firstError.name : null,
          errorMessage: firstError instanceof Error ? firstError.message : null,
          srcKind: "remote",
          sourceScheme: "https",
          sourceLength: sameOriginUrl.length,
          sourceOrigin: "same_origin_route",
          sanitizedTransformed: false,
          srcEqualsOriginal: true,
          currentSrc: input.audio.currentSrc || null,
          responseStatus: 200,
          responseContentType: input.result.responseContentType,
          byteLength: input.blob.size,
          readyState: input.audio.readyState,
          networkState: input.audio.networkState,
          mediaErrorCode: input.audio.error?.code ?? null,
          mediaErrorMessage: input.audio.error?.message ?? null,
          playRejected: true,
          playRejectionName: null,
          playRejectionMessage: null,
          fromCache: input.result.cached,
          chunkIndex: input.chunkIndex,
          chunkSource: input.result.cached ? "cache" : "fresh",
        });

        return attemptPlaybackWithSource({
          ...input,
          source: sameOriginUrl,
          sourceOrigin: "same_origin_route",
        });
      }
    },
    [api, attemptPlaybackWithSource],
  );

  const playChunk = useCallback(
    async (chunkIndex: number, regenerate = false) => {
      if (!options.enabled) {
        setStatus("unavailable");
        setFailure(
          "OpenAI narration is disabled on this server.",
          "feature_disabled",
        );
        return;
      }

      setError(null);
      setErrorCategory(null);
      setDebugMessage(null);
      setNeedsUserGesture(false);
      setCurrentChunkIndex(chunkIndex);
      setStatus(chunkIndex === 0 ? "preparing" : "generating");
      setStatusMessage("Preparing narration…");

      const audio = ensureAudioElement();
      const result = await fetchChunkAudio(chunkIndex, regenerate);

      setChunkCount(result.chunkCount);
      setSectionLabel(result.sectionLabel);
      setFromCache(result.cached);

      const activeRange = planRef.current?.sections.find(
        (range) =>
          chunkIndex >= range.firstChunkIndex &&
          chunkIndex < range.firstChunkIndex + range.chunkCount,
      );

      if (activeRange) {
        setCurrentSectionIndex(activeRange.sectionIndex);
        notifySectionChange(activeRange.sectionId);
      }

      updateMediaSession(result.sectionLabel);

      const playbackState = await attemptPlayback({
        audio,
        blob: result.blob,
        chunkIndex,
        result,
      });

      if (playbackState === "requires_gesture") {
        setNeedsUserGesture(true);
        setStatus("ready");
        setStatusMessage(getNarrationUserMessage("playback_requires_user_gesture"));
        return;
      }

      setStatus(result.cached ? "cached" : "playing");
      setStatusMessage(
        result.cacheWriteFailed
          ? "Playing narration (cache unavailable)"
          : result.cached
            ? "Playing cached narration"
            : "Playing OpenAI narration",
      );

      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
      }

      await waitForChunkEnded(audio);

      if (!playingRef.current) {
        return;
      }

      const plan = planRef.current;
      const nextIndex =
        plan != null
          ? getNextChunkIndexFromRanges(
              plan.sections,
              chunkIndex,
              playbackOptionsRef.current,
            )
          : null;

      if (nextIndex != null) {
        await playChunk(nextIndex, false);
        return;
      }

      playingRef.current = false;
      clearAudio();

      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "none";
      }

      const stoppedAfterSection =
        playbackOptionsRef.current.playOnlySection ||
        !playbackOptionsRef.current.autoContinue;

      if (stoppedAfterSection && plan && chunkIndex < result.chunkCount - 1) {
        setStatus("paused");
        setStatusMessage("Section complete");
        setNeedsUserGesture(false);
        return;
      }

      setStatus("finished");
      setStatusMessage(null);
      setSectionLabel(null);
      setCurrentChunkIndex(0);
      setCurrentSectionIndex(0);
      notifySectionChange(null);
      setFromCache(false);
      setNeedsUserGesture(false);
    },
    [
      attemptPlayback,
      clearAudio,
      ensureAudioElement,
      fetchChunkAudio,
      options.enabled,
      setFailure,
      notifySectionChange,
      updateMediaSession,
      waitForChunkEnded,
    ],
  );

  const play = useCallback(
    async (
      regenerate = false,
      startOptions?: { startSectionId?: string; playOnlySection?: boolean },
    ) => {
      if (!options.enabled) {
        setStatus("unavailable");
        setFailure(
          "OpenAI narration is disabled on this server.",
          "feature_disabled",
        );
        return;
      }

      try {
        ensureAudioElement();
        playingRef.current = true;
        setNeedsUserGesture(false);
        setStatus("preparing");
        setStatusMessage("Preparing narration…");
        playbackOptionsRef.current = {
          autoContinue: options.autoContinue ?? true,
          playOnlySection: startOptions?.playOnlySection ?? false,
        };
        const plan = await fetchPlan();
        const startChunk =
          getFirstChunkIndexForSectionId(
            plan.sections,
            startOptions?.startSectionId ?? "",
          ) ?? plan.sections[0]?.firstChunkIndex ?? 0;
        const startRange = plan.sections.find(
          (range) => range.firstChunkIndex === startChunk,
        );

        if (startRange) {
          setCurrentSectionIndex(startRange.sectionIndex);
          notifySectionChange(startRange.sectionId);
        }

        await playChunk(startChunk, regenerate);
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : "OpenAI narration is unavailable.";
        const category =
          typeof caught === "object" &&
          caught != null &&
          "category" in caught &&
          typeof caught.category === "string"
            ? (caught.category as NarrationErrorCategory)
            : "unknown";
        const debug =
          typeof caught === "object" &&
          caught != null &&
          "debugMessage" in caught &&
          typeof caught.debugMessage === "string"
            ? caught.debugMessage
            : null;

        setFailure(message, category, debug);
      }
    },
    [ensureAudioElement, fetchPlan, notifySectionChange, options.autoContinue, options.enabled, playChunk, setFailure],
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setStatus("paused");
    setStatusMessage("Paused");

    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "paused";
    }
  }, []);

  const resume = useCallback(async () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    try {
      await audio.play();
      setNeedsUserGesture(false);
      setStatus(fromCache ? "cached" : "playing");
      setStatusMessage(
        fromCache ? "Playing cached narration" : "Playing OpenAI narration",
      );

      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
      }

      if (status === "ready") {
        playingRef.current = true;
        await waitForChunkEnded(audio);

        if (!playingRef.current) {
          return;
        }

        const nextIndex = currentChunkIndex + 1;

        if (nextIndex < chunkCount) {
          await playChunk(nextIndex, false);
          return;
        }

        playingRef.current = false;
        clearAudio();
        setStatus("finished");
        setStatusMessage(null);
        setSectionLabel(null);
        setCurrentChunkIndex(0);
        setFromCache(false);
      }
    } catch (playError) {
      const category = categorizePlaybackFailure({
        playError,
        mediaError: audio.error,
        sourceUrl: audio.src,
      });

      if (category === "playback_requires_user_gesture") {
        setNeedsUserGesture(true);
        setStatus("ready");
        setStatusMessage(getNarrationUserMessage(category));
        return;
      }

      setFailure(getNarrationUserMessage(category), category);
    }
  }, [
    chunkCount,
    clearAudio,
    currentChunkIndex,
    fromCache,
    playChunk,
    setFailure,
    status,
    waitForChunkEnded,
  ]);

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

  const jumpToSection = useCallback(
    async (sectionId: string, playOnlySection = false) => {
      const plan = planRef.current;

      if (!plan) {
        return;
      }

      const targetChunk = getFirstChunkIndexForSectionId(plan.sections, sectionId);

      if (targetChunk == null) {
        return;
      }

      const targetRange = plan.sections.find(
        (range) => range.sectionId === sectionId,
      );

      playingRef.current = true;
      playbackOptionsRef.current.playOnlySection = playOnlySection;
      audioRef.current?.pause();

      if (targetRange) {
        setCurrentSectionIndex(targetRange.sectionIndex);
        notifySectionChange(targetRange.sectionId);
      }

      await playChunk(targetChunk, false);
    },
    [notifySectionChange, playChunk],
  );

  const previousSection = useCallback(async () => {
    const plan = planRef.current;

    if (!plan || currentSectionIndex <= 0) {
      return;
    }

    const previousChunk = getPreviousSectionFirstChunkIndex(
      plan.sections,
      currentSectionIndex,
    );

    if (previousChunk == null) {
      return;
    }

    playbackOptionsRef.current.playOnlySection = false;
    playingRef.current = true;
    audioRef.current?.pause();
    setCurrentSectionIndex(currentSectionIndex - 1);
    notifySectionChange(plan.sections[currentSectionIndex - 1]?.sectionId ?? null);
    await playChunk(previousChunk, false);
  }, [currentSectionIndex, notifySectionChange, playChunk]);

  const nextSection = useCallback(async () => {
    const plan = planRef.current;

    if (!plan || currentSectionIndex >= plan.sections.length - 1) {
      return;
    }

    const nextChunk = getNextSectionFirstChunkIndex(
      plan.sections,
      currentSectionIndex,
    );

    if (nextChunk == null) {
      return;
    }

    playbackOptionsRef.current.playOnlySection = false;
    playingRef.current = true;
    audioRef.current?.pause();
    setCurrentSectionIndex(currentSectionIndex + 1);
    notifySectionChange(plan.sections[currentSectionIndex + 1]?.sectionId ?? null);
    await playChunk(nextChunk, false);
  }, [currentSectionIndex, notifySectionChange, playChunk]);

  const regenerate = useCallback(async () => {
    if (!api.regenerateUrl || !api.buildRegenerateBody) {
      stop();
      await play(true);
      return;
    }

    const response = await fetch(api.regenerateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(api.buildRegenerateBody()),
    });

    if (!response.ok) {
      const payload = await readNarrationError(response);
      setFailure(
        payload.error,
        payload.category ?? "unknown",
        payload.debugMessage ?? null,
      );
      return;
    }

    stop();
    await play(true);
  }, [api, play, setFailure, stop]);

  useEffect(() => () => {
    playingRef.current = false;
    clearAudio();
  }, [clearAudio]);

  const cancel = useCallback(() => {
    playingRef.current = false;
    setNeedsUserGesture(false);
    clearAudio();

    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "none";
    }

    setStatus("idle");
    setStatusMessage(null);
    setSectionLabel(null);
    setCurrentChunkIndex(0);
    setFromCache(false);
    setError(null);
    setErrorCategory(null);
    setDebugMessage(null);
  }, [clearAudio]);

  return {
    status,
    statusMessage,
    sectionLabel,
    currentChunkIndex,
    chunkCount,
    currentSectionIndex,
    sectionCount,
    sections: planRef.current?.sections ?? [],
    fromCache,
    needsUserGesture,
    error,
    errorCategory,
    debugMessage,
    isPreparing: status === "preparing" || status === "generating",
    isReady: status === "ready",
    isPlaying: status === "playing" || status === "cached",
    isPaused: status === "paused",
    isFinished: status === "finished",
    play,
    pause,
    resume,
    stop,
    cancel,
    skipForward,
    skipBackward,
    previousSection,
    nextSection,
    jumpToSection,
    regenerate,
    switchToDeviceMessage:
      error ??
      "OpenAI narration is unavailable. Use device voice instead.",
  };
}
