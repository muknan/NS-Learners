'use client';

import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw, Shuffle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlashcardImage } from '@/components/flashcards/FlashcardImage';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { useMounted } from '@/hooks/useMounted';
import { shuffleFlashcards } from '@/lib/flashcards';
import type { Flashcard, FlashcardCategory } from '@/lib/flashcards.schema';

const STORAGE_KEY = 'ns-learners.flashcards.v2';
const BATCH_SIZE = 20;

type CategoryFilter = FlashcardCategory | 'all' | 'known';

type PersistedFlashcardsState = {
  knownIds?: string[];
};

const categoryFilters: Array<{ label: string; value: CategoryFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Rules', value: 'rules' },
  { label: 'Signs', value: 'signs' },
  { label: 'Safety', value: 'safety' },
  { label: 'General', value: 'general' },
  { label: 'Known', value: 'known' },
];

export function FlashcardsClient({ deck }: { deck: Flashcard[] }) {
  const allCards = useMemo(() => deck, [deck]);
  const mounted = useMounted();
  const [sessionDeck, setSessionDeck] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [knownIds, setKnownIds] = useState<Set<string>>(() => new Set());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [lastSessionIds, setLastSessionIds] = useState<string[]>([]);
  const [seenSessionIds, setSeenSessionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent): void {
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.history.pushState({ flashcards: true }, '');
    function handlePopState(): void {
      window.history.pushState({ flashcards: true }, '');
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const filteredPool = useMemo(() => {
    if (activeCategory === 'known') {
      return allCards.filter((card) => knownIds.has(card.id));
    }
    return allCards.filter((card) => activeCategory === 'all' || card.category === activeCategory);
  }, [activeCategory, allCards, knownIds]);

  const safeIndex = sessionDeck.length === 0 ? 0 : Math.min(index, sessionDeck.length - 1);
  const currentCard = sessionDeck[safeIndex];
  const isCurrentKnown = currentCard ? knownIds.has(currentCard.id) : false;
  const remainingCount = sessionDeck.filter((card) => !knownIds.has(card.id)).length;
  const isSubset = filteredPool.length > BATCH_SIZE;
  const knownIdList = useMemo(() => [...knownIds].sort(), [knownIds]);

  function goPrevious(): void {
    setIndex((current) => {
      if (sessionDeck.length === 0) {
        return 0;
      }

      const currentIndex = Math.min(current, sessionDeck.length - 1);
      return currentIndex === 0 ? sessionDeck.length - 1 : currentIndex - 1;
    });
  }

  function goNext(): void {
    setIndex((current) => {
      if (sessionDeck.length === 0) {
        return 0;
      }

      const currentIndex = Math.min(current, sessionDeck.length - 1);
      return (currentIndex + 1) % sessionDeck.length;
    });
  }

  function shuffleDeck(): void {
    if (activeCategory === 'known') return;

    const pool =
      activeCategory === 'all' ? allCards : allCards.filter((c) => c.category === activeCategory);

    const allSeen = pool.every((card) => seenSessionIds.has(card.id));
    const excludeIds = allSeen ? [] : lastSessionIds;

    if (allSeen) {
      setSeenSessionIds(new Set());
    }

    const nextDeck = drawRandomSession(pool, BATCH_SIZE, excludeIds);
    setSessionDeck(nextDeck);
    setLastSessionIds(nextDeck.map((c) => c.id));
    setSeenSessionIds((prev) => {
      const next = new Set(prev);
      for (const c of nextDeck) next.add(c.id);
      return next;
    });
    setIndex(0);
    setDetailsOpen(false);
  }

  const goNextRef = useRef(goNext);
  const goPreviousRef = useRef(goPrevious);
  const shuffleDeckRef = useRef(shuffleDeck);

  goNextRef.current = goNext;
  goPreviousRef.current = goPrevious;
  shuffleDeckRef.current = shuffleDeck;

  useEffect(() => {
    const persisted = readPersistedFlashcardsState();
    const validIds = new Set(allCards.map((card) => card.id));
    const restoredKnownIds = (persisted?.knownIds ?? []).filter((id) => validIds.has(id));

    setKnownIds(new Set(restoredKnownIds));
    setIsHydrated(true);

    const initialDeck = drawRandomSession(allCards, BATCH_SIZE, []);
    setSessionDeck(initialDeck);
    setLastSessionIds(initialDeck.map((c) => c.id));
    setSeenSessionIds(new Set(initialDeck.map((c) => c.id)));
  }, [allCards]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    writePersistedFlashcardsState({ knownIds: knownIdList });
  }, [isHydrated, knownIdList]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPreviousRef.current();
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNextRef.current();
        return;
      }

      if (event.key === 's' || event.key === 'S') {
        event.preventDefault();
        shuffleDeckRef.current();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleCategoryChange(category: CategoryFilter): void {
    setActiveCategory(category);
    const pool =
      category === 'all'
        ? allCards
        : category === 'known'
          ? allCards.filter((c) => knownIds.has(c.id))
          : allCards.filter((c) => c.category === category);

    if (category === 'known') {
      setSessionDeck(pool);
      setLastSessionIds([]);
      setIndex(0);
      setDetailsOpen(false);
      return;
    }

    const nextDeck = drawRandomSession(pool, BATCH_SIZE, lastSessionIds);
    setSessionDeck(nextDeck);
    setLastSessionIds(nextDeck.map((c) => c.id));
    setSeenSessionIds((prev) => {
      const next = new Set(prev);
      for (const c of nextDeck) next.add(c.id);
      return next;
    });
    setIndex(0);
    setDetailsOpen(false);
  }

  function toggleKnown(cardId: string): void {
    const next = new Set(knownIds);

    if (next.has(cardId)) {
      next.delete(cardId);
    } else {
      next.add(cardId);
    }

    setKnownIds(next);

    if (activeCategory === 'known') {
      const nextDeck = allCards.filter((card) => next.has(card.id));
      setSessionDeck(nextDeck);
      setIndex((current) => (nextDeck.length === 0 ? 0 : Math.min(current, nextDeck.length - 1)));
      setDetailsOpen(false);
    }
  }

  function resetAll(): void {
    setActiveCategory('all');
    const nextDeck = drawRandomSession(allCards, BATCH_SIZE, []);
    setSessionDeck(nextDeck);
    setLastSessionIds(nextDeck.map((c) => c.id));
    setSeenSessionIds(new Set(nextDeck.map((c) => c.id)));
    setIndex(0);
    setDetailsOpen(false);
    setKnownIds(new Set());
  }

  function drawRandomSession(
    pool: Flashcard[],
    batchSize: number,
    excludeIds: readonly string[],
  ): Flashcard[] {
    if (pool.length === 0) return [];

    const eligible = pool.filter((card) => !excludeIds.includes(card.id));
    const source = eligible.length >= batchSize ? eligible : pool;

    const shuffled = shuffleFlashcards(source, Date.now());
    return shuffled.slice(0, Math.min(batchSize, shuffled.length));
  }

  const controls = (
    <div className="flashcard-actions" aria-label="Flashcard controls">
      <Button
        aria-label="Previous flashcard"
        disabled={sessionDeck.length < 2}
        icon={
          mounted ? (
            <ArrowLeft aria-hidden="true" />
          ) : (
            <span className="icon-placeholder" aria-hidden="true" />
          )
        }
        onClick={goPrevious}
        tone="secondary"
      >
        Previous
      </Button>
      <Button
        aria-label="Shuffle flashcards"
        disabled={filteredPool.length < 2 || activeCategory === 'known'}
        icon={
          mounted ? (
            <Shuffle aria-hidden="true" />
          ) : (
            <span className="icon-placeholder" aria-hidden="true" />
          )
        }
        onClick={shuffleDeck}
        tone="secondary"
      >
        Shuffle
      </Button>
      <Button
        aria-label="Next flashcard"
        disabled={sessionDeck.length < 2}
        icon={
          mounted ? (
            <ArrowRight aria-hidden="true" />
          ) : (
            <span className="icon-placeholder" aria-hidden="true" />
          )
        }
        onClick={goNext}
      >
        Next
      </Button>
    </div>
  );

  return (
    <section className="flashcards-layout" aria-labelledby="flashcards-title">
      <div className="flashcards-heading">
        <div>
          <Badge tone="brand">Flashcards</Badge>
          <p className="flashcards-progress" aria-live="polite">
            {sessionDeck.length > 0
              ? activeCategory === 'known'
                ? `Card ${safeIndex + 1} of ${sessionDeck.length}`
                : `Card ${safeIndex + 1} of ${sessionDeck.length} — ${remainingCount} of ${
                    sessionDeck.length
                  } remaining`
              : activeCategory === 'known'
                ? 'No known flashcards yet'
                : '0 of 0 remaining'}
          </p>
        </div>
        <Button
          aria-label="Reset flashcards"
          icon={
            mounted ? (
              <RotateCcw aria-hidden="true" />
            ) : (
              <span className="icon-placeholder" aria-hidden="true" />
            )
          }
          onClick={resetAll}
          size="sm"
          tone="ghost"
        >
          Reset All
        </Button>
      </div>

      <div className="flashcard-toolbar" aria-label="Flashcard filters">
        <div className="flashcard-filter-list" aria-label="Category filters">
          {categoryFilters.map((filter) => (
            <button
              aria-pressed={activeCategory === filter.value}
              className="flashcard-filter-chip"
              key={filter.value}
              onClick={() => handleCategoryChange(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <Card
        className={['flashcard-view', isCurrentKnown ? 'flashcard-view--known' : '']
          .filter(Boolean)
          .join(' ')}
      >
        {currentCard ? (
          <>
            <div className="flashcard-inner">
              <button
                aria-label={
                  isCurrentKnown
                    ? `Mark ${currentCard.title} as not known`
                    : `Mark ${currentCard.title} as known`
                }
                aria-pressed={isCurrentKnown}
                className="flashcard-known-toggle"
                onClick={() => toggleKnown(currentCard.id)}
                type="button"
              >
                {mounted ? (
                  <CheckCircle2 aria-hidden="true" />
                ) : (
                  <span className="icon-placeholder" aria-hidden="true" />
                )}
                <span>{isCurrentKnown ? 'Known' : 'Mark as Known'}</span>
              </button>

              {isSubset && activeCategory !== 'known' ? <Badge tone="brand">Shuffled</Badge> : null}

              <div className="flashcard-study-area">
                <FlashcardImage card={currentCard} />

                <div className="flashcard-copy">
                  <h1 id="flashcards-title">{currentCard.title}</h1>
                  <p className="flashcard-key-point">
                    {currentCard.keyPoint ?? currentCard.summary}
                  </p>
                </div>
              </div>

              <button
                className="flashcard-detail__toggle"
                onClick={() => setDetailsOpen(true)}
                type="button"
              >
                <span>Details</span>
              </button>
            </div>

            {currentCard.handbookSection ? (
              <p className="flashcard-meta-bottom">
                <span>Handbook:</span> {currentCard.handbookSection}
              </p>
            ) : null}
          </>
        ) : (
          <div className="flashcard-inner flashcard-inner--empty">
            <h1 id="flashcards-title">No flashcards found</h1>
            <p>Try another category.</p>
          </div>
        )}
      </Card>

      {controls}

      {detailsOpen && currentCard ? (
        <Modal title={`Details — ${currentCard.title}`} onClose={() => setDetailsOpen(false)}>
          <div className="flashcard-modal-body">
            <p>{currentCard.summary}</p>
            {currentCard.handbookSection ? (
              <p className="flashcard-modal-meta">
                <strong>Handbook:</strong> {currentCard.handbookSection}
              </p>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

function readPersistedFlashcardsState(): PersistedFlashcardsState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed: unknown = JSON.parse(rawValue);
    if (!isRecord(parsed)) {
      return null;
    }

    const state: PersistedFlashcardsState = {};

    if (isStringArray(parsed.knownIds)) {
      state.knownIds = parsed.knownIds;
    }

    return state;
  } catch {
    return null;
  }
}

function writePersistedFlashcardsState(state: PersistedFlashcardsState): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures so study mode still works in private browsing.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
