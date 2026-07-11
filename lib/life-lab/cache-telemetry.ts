import { AsyncLocalStorage } from "node:async_hooks";

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

type LifeLabRequestTelemetry = {
  cacheMisses: Set<string>;
  cacheResults: Map<string, LifeLabCacheEventResult>;
  driveCalls: number;
  filesFetched: string[];
  staleFallback: boolean;
  refreshRequested: boolean;
};

const requestTelemetry = new AsyncLocalStorage<LifeLabRequestTelemetry>();

function createRequestTelemetry(
  options: { staleFallback?: boolean; refreshRequested?: boolean } = {},
): LifeLabRequestTelemetry {
  return {
    cacheMisses: new Set(),
    cacheResults: new Map(),
    driveCalls: 0,
    filesFetched: [],
    staleFallback: options.staleFallback ?? false,
    refreshRequested: options.refreshRequested ?? false,
  };
}

function cacheLookupKey(type: LifeLabCacheEventType, key: string): string {
  return `${type}:${key}`;
}

export function canViewLifeLabCacheDiagnostics(isAdmin: boolean): boolean {
  return process.env.NODE_ENV === "development" || isAdmin;
}

export function runLifeLabRequestTelemetry<T>(
  fn: () => Promise<T>,
  options: { staleFallback?: boolean; refreshRequested?: boolean } = {},
): Promise<T> {
  return requestTelemetry.run(createRequestTelemetry(options), fn);
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

  logLifeLabCacheEvent({
    type: event.type,
    key: event.key,
    result: "miss",
    driveCalls: store?.driveCalls ?? 0,
    tags: event.tags,
  });
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

  if (result === "hit" && event.type !== "playlist") {
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

  store?.cacheResults.set(lookupKey, result);

  return result;
}

export function logLifeLabCacheEvent(event: LifeLabCacheLogEvent): void {
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
  };
}

export function logLifeLabPlaylistCacheSummary(event: {
  playlistId: string;
  bundleCacheKey: string;
  assetsHit: boolean;
  noteListHit: boolean;
}): void {
  const snapshot = getLifeLabRequestTelemetrySnapshot();

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

export function redactLifeLabCacheLogForTests(
  event: LifeLabCacheLogEvent,
): LifeLabCacheLogEvent {
  return {
    ...event,
    key: event.key.replace(/[A-Za-z0-9_-]{20,}/g, "[redacted]"),
  };
}
