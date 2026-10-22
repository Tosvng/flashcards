import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../../domain/errors';
import type { DeckCard, Level } from '../../domain/types';
import { useDeck } from './useDeck';

export type ReviewQueue =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: () => void }
  | { status: 'complete' }
  | {
      status: 'ready';
      card: DeckCard;
      level: Level | null;
      remaining: number;
      /** Changes for every card shown, so a re-queued card still gets a fresh review. */
      attempt: number;
      /** Loads the next card from the server's authoritative deck; resolves with an error message or null. */
      advance: () => Promise<string | null>;
    };

/** Walks the day's deck one card at a time; the server decides the order after every review. */
export function useReviewQueue(): ReviewQueue {
  const deck = useDeck();
  const [current, setCurrent] = useState<DeckCard | null | undefined>(undefined); // undefined = not loaded yet
  const [level, setLevel] = useState<Level | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (current === undefined && deck.isSuccess && !deck.isFetching) {
      setCurrent(deck.data.cards[0] ?? null);
      setLevel(deck.data.level);
      setRemaining(deck.data.cards.length);
    }
  }, [current, deck.isSuccess, deck.isFetching, deck.data]);

  const advance = useCallback(async () => {
    const fresh = await deck.refetch();
    // On failure refetch() still returns the previous data, so check the error first.
    if (fresh.isError || !fresh.data) return errorMessage(fresh.error);
    setCurrent(fresh.data.cards[0] ?? null);
    setLevel(fresh.data.level);
    setRemaining(fresh.data.cards.length);
    setAttempt((n) => n + 1);
    return null;
  }, [deck]);

  if (deck.isError && current === undefined) {
    return { status: 'error', message: errorMessage(deck.error), retry: () => void deck.refetch() };
  }
  if (current === undefined) return { status: 'loading' };
  if (current === null) return { status: 'complete' };
  return { status: 'ready', card: current, level, remaining, attempt, advance };
}
