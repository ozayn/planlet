"use client";

import { useEffect, useState } from "react";

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

function readStore(): FlashcardSessionStore {
  if (typeof window === "undefined") {
    return { lastOpenedDeckId: null, recentDeckIds: [], decks: {} };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { lastOpenedDeckId: null, recentDeckIds: [], decks: {} };
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
    return { lastOpenedDeckId: null, recentDeckIds: [], decks: {} };
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
}

export function getRecentFlashcardDeckIds(): string[] {
  return readStore().recentDeckIds;
}

function clampIndex(index: number, cardCount: number): number {
  return Math.min(Math.max(0, index), Math.max(0, cardCount - 1));
}

export function useFlashcardSession(deckId: string, cardCount: number) {
  const [index, setIndex] = useState(() => {
    const existing = readStore().decks[deckId];
    return existing ? clampIndex(existing.index, cardCount) : 0;
  });
  const [revealed, setRevealed] = useState(() => {
    return Boolean(readStore().decks[deckId]?.revealed);
  });
  const [shuffledOrder, setShuffledOrder] = useState<number[] | null>(() => {
    const existing = readStore().decks[deckId]?.shuffledOrder;
    return Array.isArray(existing) ? existing : null;
  });

  useEffect(() => {
    const store = readStore();
    const nextRecent = [
      deckId,
      ...store.recentDeckIds.filter((id) => id !== deckId),
    ].slice(0, 40);

    writeStore({
      lastOpenedDeckId: deckId,
      recentDeckIds: nextRecent,
      decks: {
        ...store.decks,
        [deckId]: {
          deckId,
          index,
          revealed,
          shuffledOrder,
          lastOpenedAt: new Date().toISOString(),
        },
      },
    });
  }, [deckId, index, revealed, shuffledOrder]);

  function resolveOrderIndex(viewIndex: number): number {
    if (!shuffledOrder || shuffledOrder.length !== cardCount) {
      return viewIndex;
    }

    return shuffledOrder[viewIndex] ?? viewIndex;
  }

  function goTo(nextViewIndex: number): void {
    if (nextViewIndex < 0 || nextViewIndex >= cardCount) {
      return;
    }

    setIndex(nextViewIndex);
    setRevealed(false);
  }

  function shuffle(): void {
    const order = Array.from({ length: cardCount }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j]!, order[i]!];
    }
    setShuffledOrder(order);
    setIndex(0);
    setRevealed(false);
  }

  function restart(): void {
    setShuffledOrder(null);
    setIndex(0);
    setRevealed(false);
  }

  return {
    viewIndex: index,
    cardIndex: resolveOrderIndex(index),
    revealed,
    setRevealed,
    shuffled: Boolean(shuffledOrder),
    goTo,
    shuffle,
    restart,
  };
}
