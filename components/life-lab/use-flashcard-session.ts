"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "planlet.life-lab.flashcard-session.v1";

export type FlashcardSessionState = {
  deckId: string;
  index: number;
  revealed: boolean;
  shuffledOrder: number[] | null;
  lastOpenedAt: string;
};

type FlashcardSessionStore = {
  lastOpenedDeckId: string | null;
  recentDeckIds: string[];
  decks: Record<string, FlashcardSessionState>;
};

type DeckSessionSlice = {
  index: number;
  revealed: boolean;
  shuffledOrder: number[] | null;
};

const listeners = new Set<() => void>();
const snapshotCache = new Map<string, { raw: string; slice: DeckSessionSlice }>();
let recentIdsCache: { raw: string | null; ids: string[] } = {
  raw: null,
  ids: [],
};

function emptyStore(): FlashcardSessionStore {
  return { lastOpenedDeckId: null, recentDeckIds: [], decks: {} };
}

function readStore(): FlashcardSessionStore {
  if (typeof window === "undefined") {
    return emptyStore();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyStore();
    }

    const parsed = JSON.parse(raw) as FlashcardSessionStore;
    return {
      lastOpenedDeckId: parsed.lastOpenedDeckId ?? null,
      recentDeckIds: Array.isArray(parsed.recentDeckIds)
        ? parsed.recentDeckIds.filter((id) => typeof id === "string")
        : [],
      decks: parsed.decks && typeof parsed.decks === "object" ? parsed.decks : {},
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: FlashcardSessionStore): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore quota / private mode failures.
  }

  snapshotCache.clear();
  recentIdsCache = { raw: null, ids: [] };
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      snapshotCache.clear();
      recentIdsCache = { raw: null, ids: [] };
      listener();
    }
  };

  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function clampIndex(index: number, cardCount: number): number {
  return Math.min(Math.max(0, index), Math.max(0, cardCount - 1));
}

function getRawStorage(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getDeckSessionSnapshot(
  deckId: string,
  cardCount: number,
): DeckSessionSlice {
  const raw = getRawStorage() ?? "";
  const cacheKey = `${deckId}::${cardCount}`;
  const cached = snapshotCache.get(cacheKey);
  if (cached && cached.raw === raw) {
    return cached.slice;
  }

  const existing = readStore().decks[deckId];
  const slice: DeckSessionSlice = {
    index: existing ? clampIndex(existing.index, cardCount) : 0,
    revealed: Boolean(existing?.revealed),
    shuffledOrder: Array.isArray(existing?.shuffledOrder)
      ? existing.shuffledOrder
      : null,
  };
  snapshotCache.set(cacheKey, { raw, slice });
  return slice;
}

const SERVER_SLICE: DeckSessionSlice = {
  index: 0,
  revealed: false,
  shuffledOrder: null,
};

function touchRecent(deckId: string, store: FlashcardSessionStore): string[] {
  return [deckId, ...store.recentDeckIds.filter((id) => id !== deckId)].slice(
    0,
    40,
  );
}

function persistDeckSession(
  deckId: string,
  slice: DeckSessionSlice,
): void {
  const store = readStore();
  writeStore({
    lastOpenedDeckId: deckId,
    recentDeckIds: touchRecent(deckId, store),
    decks: {
      ...store.decks,
      [deckId]: {
        deckId,
        index: slice.index,
        revealed: slice.revealed,
        shuffledOrder: slice.shuffledOrder,
        lastOpenedAt: new Date().toISOString(),
      },
    },
  });
}

export function getRecentFlashcardDeckIds(): string[] {
  const raw = getRawStorage();
  if (recentIdsCache.raw === raw) {
    return recentIdsCache.ids;
  }

  const ids = readStore().recentDeckIds;
  recentIdsCache = { raw, ids };
  return ids;
}

/**
 * Session state comes from localStorage via useSyncExternalStore so the server
 * snapshot (card 1) matches the first client render, then storage hydrates.
 */
export function useFlashcardSession(deckId: string, cardCount: number) {
  const getSnapshot = useCallback(
    () => getDeckSessionSnapshot(deckId, cardCount),
    [deckId, cardCount],
  );

  const slice = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => SERVER_SLICE,
  );

  function resolveOrderIndex(viewIndex: number): number {
    if (!slice.shuffledOrder || slice.shuffledOrder.length !== cardCount) {
      return viewIndex;
    }

    return slice.shuffledOrder[viewIndex] ?? viewIndex;
  }

  function goTo(nextViewIndex: number): void {
    if (nextViewIndex < 0 || nextViewIndex >= cardCount) {
      return;
    }

    persistDeckSession(deckId, {
      index: nextViewIndex,
      revealed: false,
      shuffledOrder: slice.shuffledOrder,
    });
  }

  function setRevealed(value: boolean | ((current: boolean) => boolean)): void {
    const next =
      typeof value === "function" ? value(slice.revealed) : value;
    persistDeckSession(deckId, {
      index: slice.index,
      revealed: next,
      shuffledOrder: slice.shuffledOrder,
    });
  }

  function shuffle(): void {
    const order = Array.from({ length: cardCount }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j]!, order[i]!];
    }
    persistDeckSession(deckId, {
      index: 0,
      revealed: false,
      shuffledOrder: order,
    });
  }

  function restart(): void {
    persistDeckSession(deckId, {
      index: 0,
      revealed: false,
      shuffledOrder: null,
    });
  }

  return {
    viewIndex: slice.index,
    cardIndex: resolveOrderIndex(slice.index),
    revealed: slice.revealed,
    setRevealed,
    shuffled: Boolean(slice.shuffledOrder),
    goTo,
    shuffle,
    restart,
  };
}

export function useRecentFlashcardDeckIds(): string[] {
  return useSyncExternalStore(
    subscribe,
    getRecentFlashcardDeckIds,
    () => [],
  );
}
