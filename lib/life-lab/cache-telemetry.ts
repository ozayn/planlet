import { AsyncLocalStorage } from "node:async_hooks";

import {
  resolveLifeLabLogLevel,
  shouldLogLifeLab,
  type LifeLabLogLevel,
} from "@/lib/life-lab/log-level";

export type LifeLabCacheEventType =
  | "home"
  | "section"
  | "note"
  | "playlist"
  | "folder-map";

export type LifeLabCacheEventResult = "hit" | "miss";

export type LifeLabCacheLogEvent = {
  type: LifeLabCacheEventType;
  key: string;
  result: LifeLabCacheEventResult;
  driveCalls?: number;
  durationMs?: number;
  playlistId?: string;
  assetsHit?: boolean;
  noteListHit?: boolean;
  tags?: string[];
};

export type LifeLabRequestMeta = {
  route?: string;
  playlistId?: string;
  sectionId?: string;
};

type LifeLabRequestTelemetry = {
  cacheMisses: Set<string>;
  cacheResults: Map<string, LifeLabCacheEventResult>;
  driveCalls: number;
  filesFetched: string[];
  staleFallback: boolean;
  refreshRequested: boolean;
  startedAt: number;
  meta: LifeLabRequestMeta;
};

export type LifeLabRequestSummary = {
  route: string | null;
  playlistId: string | null;
  sectionId: string | null;
  cacheHits: number;
  cacheMisses: number;
  notePayloadHits: number;
  notePayloadMisses: number;
  sectionIndex: LifeLabCacheEventResult | null;
  noteList: LifeLabCacheEventResult | null;
  playlistAssets: LifeLabCacheEventResult | null;
  driveCalls: number;
  notesLoaded: number;
  durationMs: number;
  refreshRequested: boolean;
  staleFallback: boolean;
};

const requestTelemetry = new AsyncLocalStorage<LifeLabRequestTelemetry>();

function createRequestTelemetry(
  options: {
    staleFallback?: boolean;
    refreshRequested?: boolean;
    meta?: LifeLabRequestMeta;
  } = {},
): LifeLabRequestTelemetry {
  return {
    cacheMisses: new Set(),
    cacheResults: new Map(),
    driveCalls: 0,
    filesFetched: [],
    staleFallback: options.staleFallback ?? false,
    refreshRequested: options.refreshRequested ?? false,
    startedAt: Date.now(),
    meta: { ...(options.meta ?? {}) },
  };
}

function cacheLookupKey(type: LifeLabCacheEventType, key: string): string {
  return `${type}:${key}`;
}

export function canViewLifeLabCacheDiagnostics(isAdmin: boolean): boolean {
  return process.env.NODE_ENV === "development" || isAdmin;
}

export function setLifeLabRequestMeta(meta: LifeLabRequestMeta): void {
  const store = requestTelemetry.getStore();

  if (!store) {
    return;
  }

  store.meta = { ...store.meta, ...meta };
}

export function runLifeLabRequestTelemetry<T>(
  fn: () => Promise<T>,
  options: {
    staleFallback?: boolean;
    refreshRequested?: boolean;
    meta?: LifeLabRequestMeta;
  } = {},
): Promise<T> {
  return requestTelemetry.run(createRequestTelemetry(options), async () => {
    try {
      return await fn();
    } finally {
      emitLifeLabRequestSummaryIfNeeded();
    }
  });
}

export function getLifeLabRequestTelemetrySnapshot():
  | LifeLabRequestTelemetry
  | null {
  return requestTelemetry.getStore() ?? null;
}

export function markLifeLabStaleFallback(): void {
  const store = requestTelemetry.getStore();

  if (store) {
    store.staleFallback = true;
  }
}

export function recordLifeLabDriveCall(
  kind: "list" | "download",
  fileId?: string,
): void {
  const store = requestTelemetry.getStore();

  if (!store) {
    return;
  }

  store.driveCalls += 1;

  if (kind === "download" && fileId) {
    store.filesFetched.push(fileId);
  }
}

export function getLifeLabCacheResult(
  type: LifeLabCacheEventType,
  key: string,
): LifeLabCacheEventResult | null {
  return (
    requestTelemetry.getStore()?.cacheResults.get(cacheLookupKey(type, key)) ??
    null
  );
}

export function beginLifeLabCacheMiss(event: {
  type: LifeLabCacheEventType;
  key: string;
  tags?: string[];
}): void {
  const store = requestTelemetry.getStore();
  const lookupKey = cacheLookupKey(event.type, event.key);

  store?.cacheMisses.add(lookupKey);
  store?.cacheResults.set(lookupKey, "miss");

  if (shouldLogLifeLab("verbose")) {
    logLifeLabCacheEvent({
      type: event.type,
      key: event.key,
      result: "miss",
      driveCalls: store?.driveCalls ?? 0,
      tags: event.tags,
    });
  }
}

export function finishLifeLabCacheLookup(event: {
  type: LifeLabCacheEventType;
  key: string;
  durationMs: number;
  tags?: string[];
  playlistId?: string;
  assetsHit?: boolean;
  noteListHit?: boolean;
}): LifeLabCacheEventResult {
  const store = requestTelemetry.getStore();
  const lookupKey = cacheLookupKey(event.type, event.key);
  const result: LifeLabCacheEventResult = store?.cacheMisses.has(lookupKey)
    ? "miss"
    : "hit";

  if (
    result === "hit" &&
    event.type !== "playlist" &&
    shouldLogLifeLab("verbose")
  ) {
    logLifeLabCacheEvent({
      type: event.type,
      key: event.key,
      result,
      driveCalls: store?.driveCalls ?? 0,
      durationMs: event.durationMs,
      tags: event.tags,
      playlistId: event.playlistId,
      assetsHit: event.assetsHit,
      noteListHit: event.noteListHit,
    });
  }

  if (event.playlistId) {
    setLifeLabRequestMeta({ playlistId: event.playlistId });
  }

  store?.cacheResults.set(lookupKey, result);

  return result;
}

export function logLifeLabCacheEvent(event: LifeLabCacheLogEvent): void {
  if (!shouldLogLifeLab("verbose")) {
    return;
  }

  const payload = {
    type: event.type,
    key: event.key,
    result: event.result,
    driveCalls: event.driveCalls ?? 0,
    durationMs: event.durationMs ?? null,
    playlistId: event.playlistId ?? null,
    assetsHit: event.assetsHit ?? null,
    noteListHit: event.noteListHit ?? null,
    tags: event.tags ?? null,
  };

  console.info("[life-lab-cache]", JSON.stringify(payload));
}

export function buildLifeLabRequestSummary(
  snapshot: LifeLabRequestTelemetry,
): LifeLabRequestSummary {
  let cacheHits = 0;
  let cacheMisses = 0;
  let notePayloadHits = 0;
  let notePayloadMisses = 0;
  let sectionIndex: LifeLabCacheEventResult | null = null;
  let noteList: LifeLabCacheEventResult | null = null;
  let playlistAssets: LifeLabCacheEventResult | null = null;

  for (const [lookupKey, result] of snapshot.cacheResults) {
    if (result === "hit") {
      cacheHits += 1;
    } else {
      cacheMisses += 1;
    }

    if (lookupKey.startsWith("note:")) {
      if (result === "hit") {
        notePayloadHits += 1;
      } else {
        notePayloadMisses += 1;
      }
    }

    if (lookupKey.startsWith("section:")) {
      sectionIndex = result;
      noteList = result;
    }

    if (lookupKey.startsWith("playlist:")) {
      playlistAssets = result;
    }

    if (lookupKey.startsWith("home:")) {
      sectionIndex = sectionIndex ?? result;
    }
  }

  return {
    route: snapshot.meta.route ?? null,
    playlistId: snapshot.meta.playlistId ?? null,
    sectionId: snapshot.meta.sectionId ?? null,
    cacheHits,
    cacheMisses,
    notePayloadHits,
    notePayloadMisses,
    sectionIndex,
    noteList,
    playlistAssets,
    driveCalls: snapshot.driveCalls,
    notesLoaded: notePayloadHits + notePayloadMisses,
    durationMs: Math.max(0, Date.now() - snapshot.startedAt),
    refreshRequested: snapshot.refreshRequested,
    staleFallback: snapshot.staleFallback,
  };
}

function emitLifeLabRequestSummaryIfNeeded(): void {
  const store = requestTelemetry.getStore();

  if (!store || !shouldLogLifeLab("summary")) {
    return;
  }

  const summary = buildLifeLabRequestSummary(store);

  if (
    summary.cacheHits === 0 &&
    summary.cacheMisses === 0 &&
    summary.driveCalls === 0
  ) {
    return;
  }

  console.info("[life-lab-summary]", JSON.stringify(summary));
}

export function buildLifeLabCacheDiagnostic(input: {
  type: LifeLabCacheEventType;
  key: string;
  result: LifeLabCacheEventResult;
  tags: string[];
  cachedAt: string;
  ttlSeconds: number;
  snapshot?: LifeLabRequestTelemetry | null;
}): {
  fromCache: boolean;
  cacheKey: string;
  cacheTags: string[];
  cachedAt: string;
  expiresAt: string;
  driveCalls: number;
  filesFetched: string[];
  staleFallback: boolean;
  refreshRequested: boolean;
  durationMs?: number;
  logLevel: LifeLabLogLevel;
} {
  const snapshot = input.snapshot ?? getLifeLabRequestTelemetrySnapshot();

  return {
    fromCache: input.result === "hit",
    cacheKey: input.key,
    cacheTags: input.tags,
    cachedAt: input.cachedAt,
    expiresAt: new Date(
      new Date(input.cachedAt).getTime() + input.ttlSeconds * 1000,
    ).toISOString(),
    driveCalls: snapshot?.driveCalls ?? 0,
    filesFetched: [...(snapshot?.filesFetched ?? [])],
    staleFallback: snapshot?.staleFallback ?? false,
    refreshRequested: snapshot?.refreshRequested ?? false,
    logLevel: resolveLifeLabLogLevel(),
  };
}

export function logLifeLabPlaylistCacheSummary(event: {
  playlistId: string;
  bundleCacheKey: string;
  assetsHit: boolean;
  noteListHit: boolean;
}): void {
  const snapshot = getLifeLabRequestTelemetrySnapshot();
  setLifeLabRequestMeta({ playlistId: event.playlistId });

  if (shouldLogLifeLab("verbose")) {
    logLifeLabCacheEvent({
      type: "playlist",
      key: event.bundleCacheKey,
      result: event.assetsHit ? "hit" : "miss",
      playlistId: event.playlistId,
      assetsHit: event.assetsHit,
      noteListHit: event.noteListHit,
      driveCalls: snapshot?.driveCalls ?? 0,
    });
  }
}

export function logLifeLabError(
  scope: string,
  payload: Record<string, unknown>,
): void {
  if (!shouldLogLifeLab("error")) {
    return;
  }

  console.error(`[${scope}]`, JSON.stringify(payload));
}

export function redactLifeLabCacheLogForTests(
  event: LifeLabCacheLogEvent,
): LifeLabCacheLogEvent {
  return {
    ...event,
    key: event.key.replace(/[A-Za-z0-9_-]{20,}/g, "[redacted]"),
  };
}
