import { describe, it, expect, vi, type Mock } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useReviewFlow } from '../../src/application/hooks/useReviewFlow';
import { useReviewQueue } from '../../src/application/hooks/useReviewQueue';
import { useAddFlashcard } from '../../src/application/hooks/useAddFlashcard';
import { useStartSession } from '../../src/application/hooks/useStartSession';
import { keys } from '../../src/application/queryKeys';
import type { DeckCard } from '../../src/domain/types';
import { FakeBackend, createFakeServices, deckCard, makeWrapper, summary } from '../fakes';

const WORDS = { 1: { word: 'été', phonetic: '/ete/' }, 2: { word: 'chat', phonetic: null } };

function setup(backend = new FakeBackend(WORDS)) {
  const services = createFakeServices({ deck: backend, review: backend });
  return { backend, services, ...makeWrapper(services) };
}

const type = async (result: { current: ReturnType<typeof useReviewFlow> }, word: string) => {
  for (const [i, ch] of Array.from(word).entries()) await act(async () => result.current.setLetter(i, ch));
};

describe('useReviewFlow (one card)', () => {
  it('passes: spelling → reveal → pronunciation yes → result', async () => {
    const { backend, wrapper } = setup();
    const { result } = await renderHook(() => useReviewFlow(deckCard(1, 'été')), { wrapper });
    await type(result, 'été');
    await act(async () => { await result.current.submitSpelling(); });
    expect(result.current.state).toMatchObject({ phase: 'revealed', reveal: { correctSpelling: 'été', phoneticSpelling: '/ete/', spellingCorrect: true } });

    await act(async () => { await result.current.markPronunciation(true); });
    expect(result.current.state).toMatchObject({ phase: 'result', result: { passed: true, newLevel: 2 } });
    expect(backend.submitted).toEqual([{ flashcardId: 1, spellingInput: 'été', pronunciationCorrect: true }]);
  });

  it('fails on wrong spelling but still reveals the answer first', async () => {
    const { wrapper } = setup();
    const { result } = await renderHook(() => useReviewFlow(deckCard(1, 'été')), { wrapper });
    await type(result, 'ete');
    await act(async () => { await result.current.submitSpelling(); });
    expect(result.current.state.reveal).toMatchObject({ spellingCorrect: false, correctSpelling: 'été' });
    await act(async () => { await result.current.markPronunciation(true); });
    expect(result.current.state.result).toMatchObject({ passed: false, newLevel: 1 });
  });

  it('does nothing until every box is filled', async () => {
    const { backend, wrapper } = setup();
    const reveal = vi.spyOn(backend, 'reveal');
    const { result } = await renderHook(() => useReviewFlow(deckCard(1, 'été')), { wrapper });
    await type(result, 'ét');
    await act(async () => { await result.current.submitSpelling(); });
    expect(result.current.state.phase).toBe('answering');
    expect(reveal).not.toHaveBeenCalled();
  });

  it('recovers from a failed reveal, keeping what the user typed', async () => {
    const { backend, wrapper } = setup();
    const { result } = await renderHook(() => useReviewFlow(deckCard(1, 'été')), { wrapper });
    await type(result, 'été');
    backend.failNextReveal = true;
    await act(async () => { await result.current.submitSpelling(); });
    expect(result.current.state).toMatchObject({ phase: 'answering', error: 'Something went wrong. Please try again.' });
    expect(result.current.state.slots).toEqual(['é', 't', 'é']);
    await act(async () => { await result.current.submitSpelling(); });
    expect(result.current.state.phase).toBe('revealed');
  });

  it('recovers from a failed save and lets the user retry the pronunciation answer', async () => {
    const { backend, wrapper } = setup();
    const { result } = await renderHook(() => useReviewFlow(deckCard(2, 'chat')), { wrapper });
    await type(result, 'chat');
    await act(async () => { await result.current.submitSpelling(); });
    backend.failNextSubmit = true;
    await act(async () => { await result.current.markPronunciation(true); });
    expect(result.current.state).toMatchObject({ phase: 'revealed', pronunciationCorrect: null });
    expect(result.current.state.error).toBeTruthy();
    await act(async () => { await result.current.markPronunciation(true); });
    expect(result.current.state.phase).toBe('result');
  });

  it('ignores a pronunciation answer before the reveal', async () => {
    const { backend, wrapper } = setup();
    const { result } = await renderHook(() => useReviewFlow(deckCard(2, 'chat')), { wrapper });
    await act(async () => { await result.current.markPronunciation(true); });
    expect(result.current.state.phase).toBe('answering');
    expect(backend.submitted).toHaveLength(0);
  });
});

describe('useReviewQueue (deck progression)', () => {
  it('loads the first card, then follows the server deck order, re-queuing a failed card', async () => {
    const { backend, wrapper } = setup();
    const { result } = await renderHook(() => useReviewQueue(), { wrapper });
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    const first = result.current as Extract<ReturnType<typeof useReviewQueue>, { status: 'ready' }>;
    expect(first).toMatchObject({ card: { flashcardId: 1 }, remaining: 2, level: 1, attempt: 0 });

    // Fail card 1 on the server → it goes to the back; advance shows card 2.
    await backend.submit({ flashcardId: 1, spellingInput: 'x', pronunciationCorrect: false });
    let error: string | null = 'unset';
    await act(async () => { error = await first.advance(); });
    expect(error).toBeNull();
    const second = result.current as Extract<ReturnType<typeof useReviewQueue>, { status: 'ready' }>;
    expect(second).toMatchObject({ card: { flashcardId: 2 }, remaining: 2, attempt: 1 });

    // Pass card 2, then card 1 comes back; pass it → complete.
    await backend.submit({ flashcardId: 2, spellingInput: 'chat', pronunciationCorrect: true });
    await act(async () => { await second.advance(); });
    const third = result.current as Extract<ReturnType<typeof useReviewQueue>, { status: 'ready' }>;
    expect(third).toMatchObject({ card: { flashcardId: 1 }, remaining: 1, attempt: 2 });
    await backend.submit({ flashcardId: 1, spellingInput: 'été', pronunciationCorrect: true });
    await act(async () => { await third.advance(); });
    expect(result.current.status).toBe('complete');
  });

  it('reports complete when the deck is already empty', async () => {
    const { wrapper } = setup(new FakeBackend({}));
    const { result } = await renderHook(() => useReviewQueue(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('complete'));
  });

  it('reports an error with a working retry', async () => {
    const services = createFakeServices();
    (services.deck.current as Mock).mockRejectedValueOnce(new Error('down'));
    const { wrapper } = makeWrapper(services);
    const { result } = await renderHook(() => useReviewQueue(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('error'));
    (services.deck.current as Mock).mockResolvedValueOnce({ sessionComplete: false, level: 1, cards: [deckCard(1, 'a')] as DeckCard[] });
    await act(async () => { (result.current as { retry: () => void }).retry(); });
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  it('returns an error message when advancing fails', async () => {
    const backend = new FakeBackend(WORDS);
    const { wrapper } = setup(backend);
    const { result } = await renderHook(() => useReviewQueue(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    const ready = result.current as Extract<ReturnType<typeof useReviewQueue>, { status: 'ready' }>;
    backend.current = async () => { throw new Error('offline'); };
    let message: string | null = null;
    await act(async () => { message = await ready.advance(); });
    expect(message).toBeTruthy();
  });
});

describe('useStartSession', () => {
  it('sends the skip flag and writes the started session into the cache', async () => {
    const services = createFakeServices();
    // gcTime: Infinity so an observer-less cache entry is not collected before we read it (and sets no timer).
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: 0 } } });
    const { wrapper, queryClient } = makeWrapper(services, { queryClient: client });
    queryClient.setQueryData(keys.session, summary());
    const { result } = await renderHook(() => useStartSession(), { wrapper });
    await act(async () => { await result.current.mutateAsync(true); });
    expect(services.session.start).toHaveBeenCalledWith(true);
    expect(queryClient.getQueryData(keys.session)).toMatchObject({ started: true, skipNewCards: true });
  });
});

describe('useAddFlashcard', () => {
  it('refreshes the Today preview after a word is added (the new-card count changes)', async () => {
    const services = createFakeServices();
    (services.flashcards.add as Mock).mockResolvedValue({ flashcardId: 1 });
    const { wrapper, queryClient } = makeWrapper(services);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = await renderHook(() => useAddFlashcard(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ frenchText: 'a', englishTranslation: 'b', photoUrl: 'https://x.co', description: 'd', phoneticSpelling: null });
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.session });
  });

  it('does not refresh anything when adding fails', async () => {
    const services = createFakeServices();
    (services.flashcards.add as Mock).mockRejectedValue(new Error('nope'));
    const { wrapper, queryClient } = makeWrapper(services);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = await renderHook(() => useAddFlashcard(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ frenchText: 'a', englishTranslation: 'b', photoUrl: 'https://x.co', description: 'd', phoneticSpelling: null }).catch(() => undefined);
    });
    expect(invalidate).not.toHaveBeenCalled();
  });
});
