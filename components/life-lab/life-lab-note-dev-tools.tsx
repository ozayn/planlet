"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import type { LifeLabNoteDevMeta } from "@/lib/life-lab/constants";
import {
  buildSameOriginNarrationChunkUrl,
  buildSameOriginNarrationTestUrl,
} from "@/lib/life-lab/narration-audio-source";
import {
  categorizePlaybackFailure,
  createNarrationObjectUrl,
  logNarrationPlaybackDiagnostic,
  normalizeNarrationAudioBlob,
  replaceAudioObjectUrl,
  waitForAudioCanPlay,
} from "@/lib/life-lab/narration-playback";
import {
  lifeLabDebugDownloadUrl,
  lifeLabDebugRawUrl,
  lifeLabNoteRefreshUrl,
} from "@/lib/life-lab/dev";

type LifeLabNoteDevToolsProps = {
  sectionId: string;
  slug: string;
  dev: LifeLabNoteDevMeta;
  markdown?: string;
  compact?: boolean;
};

type MenuItem = {
  label: string;
  onClick?: () => void | Promise<void>;
  href?: string;
  external?: boolean;
};

export function LifeLabNoteDevTools({
  sectionId,
  slug,
  dev,
  markdown,
  compact = false,
}: LifeLabNoteDevToolsProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  async function copyText(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(successMessage);
      setOpen(false);
    } catch {
      setStatus("Copy failed");
    }
  }

  async function copyMarkdown() {
    if (markdown) {
      await copyText(markdown, "Markdown copied");
      return;
    }

    try {
      const response = await fetch(lifeLabDebugRawUrl(sectionId, slug));

      if (!response.ok) {
        setStatus("Could not load Markdown");
        return;
      }

      await copyText(await response.text(), "Markdown copied");
    } catch {
      setStatus("Could not load Markdown");
    }
  }

  async function playDiagnosticSource(input: {
    label: string;
    source: string;
    sourceOrigin: "fresh_blob" | "same_origin_route" | "direct_api_route";
    blob?: Blob;
  }) {
    setStatus(`Running ${input.label}…`);

    const audio = new Audio();
    const activeUrlRef = { current: null as string | null };

    try {
      replaceAudioObjectUrl({
        audio,
        nextUrl: input.source,
        activeUrlRef,
        pageOrigin: window.location.origin,
      });

      await waitForAudioCanPlay(audio);
      await audio.play();

      logNarrationPlaybackDiagnostic(`${input.label} succeeded`, {
        errorName: null,
        errorMessage: null,
        srcKind: input.source.startsWith("blob:") ? "blob" : "remote",
        sourceScheme: input.source.startsWith("blob:") ? "blob" : "https",
        sourceLength: input.source.length,
        sourceOrigin: input.sourceOrigin,
        sanitizedTransformed: false,
        srcEqualsOriginal: audio.src === input.source,
        currentSrc: audio.currentSrc || null,
        responseStatus: 200,
        responseContentType: input.blob?.type ?? "audio/mpeg",
        byteLength: input.blob?.size ?? 0,
        readyState: audio.readyState,
        networkState: audio.networkState,
        mediaErrorCode: null,
        mediaErrorMessage: null,
        playRejected: false,
        playRejectionName: null,
        playRejectionMessage: null,
        fromCache: false,
        chunkIndex: 0,
        chunkSource: "unknown",
      });

      audio.addEventListener("ended", () => {
        if (activeUrlRef.current) {
          URL.revokeObjectURL(activeUrlRef.current);
          activeUrlRef.current = null;
        }
      });

      setStatus(`${input.label} playing`);
      setOpen(false);
    } catch (error) {
      const category = categorizePlaybackFailure({
        playError: error,
        mediaError: audio.error,
        blobSize: input.blob?.size,
        sourceUrl: input.source,
      });

      setStatus(`${input.label} failed (${category})`);
      setOpen(false);
    }
  }

  async function runBlobPlaybackTest() {
    try {
      const response = await fetch(buildSameOriginNarrationTestUrl(), {
        method: "POST",
      });

      if (!response.ok) {
        setStatus("Blob test fetch failed");
        setOpen(false);
        return;
      }

      const blob = normalizeNarrationAudioBlob(
        await response.blob(),
        response.headers.get("Content-Type"),
      );
      const objectUrl = createNarrationObjectUrl(blob);

      await playDiagnosticSource({
        label: "Blob playback test",
        source: objectUrl,
        sourceOrigin: "fresh_blob",
        blob,
      });
    } catch {
      setStatus("Blob playback test failed");
      setOpen(false);
    }
  }

  async function runDirectRoutePlaybackTest() {
    await playDiagnosticSource({
      label: "Direct route playback test",
      source: buildSameOriginNarrationTestUrl(),
      sourceOrigin: "direct_api_route",
    });
  }

  async function runCachedChunkPlaybackTest() {
    await playDiagnosticSource({
      label: "Cached chunk playback test",
      source: buildSameOriginNarrationChunkUrl({
        sectionId,
        slug,
        chunkIndex: 0,
      }),
      sourceOrigin: "same_origin_route",
    });
  }

  async function runTtsTest() {
    await runBlobPlaybackTest();
  }

  const menuItems: MenuItem[] = [
    {
      label: "Play Blob test",
      onClick: runBlobPlaybackTest,
    },
    {
      label: "Play direct route test",
      onClick: runDirectRoutePlaybackTest,
    },
    {
      label: "Play cached chunk test",
      onClick: runCachedChunkPlaybackTest,
    },
    {
      label: "Generate TTS test",
      onClick: runTtsTest,
    },
    {
      label: "Open raw Markdown",
      href: lifeLabDebugRawUrl(sectionId, slug),
      external: true,
    },
    {
      label: "Download .md",
      href: lifeLabDebugDownloadUrl(sectionId, slug),
    },
    {
      label: "Copy Markdown",
      onClick: copyMarkdown,
    },
    {
      label: "Copy Drive file ID",
      onClick: () => copyText(dev.fileId, "File ID copied"),
    },
    {
      label: "Refresh this note",
      href: lifeLabNoteRefreshUrl(sectionId, slug),
    },
  ];

  return (
    <div
      ref={containerRef}
      className={compact ? "relative shrink-0" : "relative"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-light transition-colors hover:bg-accent-cream/40 hover:text-muted"
        onClick={() => {
          setOpen((current) => !current);
          setStatus(null);
        }}
        title="Life Lab developer tools"
      >
        <span aria-hidden="true" className="text-sm leading-none">
          ⋯
        </span>
        <span className="sr-only">Life Lab developer tools</span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-44 rounded-lg border border-border-soft bg-surface p-1 shadow-sm"
        >
          {menuItems.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                role="menuitem"
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                className="block rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent-cream/30"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className="block w-full rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent-cream/30"
                onClick={() => {
                  void item.onClick?.();
                }}
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      ) : null}

      {status && compact ? (
        <p className="absolute right-0 top-full mt-1 whitespace-nowrap text-xs text-muted-light">
          {status}
        </p>
      ) : null}
    </div>
  );
}
