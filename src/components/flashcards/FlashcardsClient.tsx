'use client';

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  RotateCcw,
  Search,
  Shuffle,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { FlashcardImage } from '@/components/flashcards/FlashcardImage';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { shuffleFlashcards } from '@/lib/flashcards';
import type { Flashcard, FlashcardCategory } from '@/lib/flashcards.schema';

const STORAGE_KEY = 'ns-learners.flashcards.v2';
const BATCH_SIZE = 20;

type CategoryFilter = FlashcardCategory | 'all';

type PersistedFlashcardsState = {
  knownIds?: string[];
};

const categoryFilters: Array<{ label: string; value: CategoryFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Rules', value: 'rules' },
  { label: 'Signs', value: 'signs' },
  { label: 'Safety', value: 'safety' },
  { label: 'General', value: 'general' },
];

export function FlashcardsClient({ deck }: { deck: Flashcard[] }) {
  const allCards = useMemo(() => deck, [deck]);
  const [sessionDeck, setSessionDeck] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [knownIds, setKnownIds] = useState<Set<string>>(() => new Set());
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredPool = useMemo(
    () =>
      allCards.filter((card) => {
        const matchesCategory = activeCategory === 'all' || card.category === activeCategory;
        const matchesSearch =
          normalizedSearch.length === 0 ||
          card.title.toLowerCase().includes(normalizedSearch) ||
          (card.keyPoint?.toLowerCase().includes(normalizedSearch) ?? false);

        return matchesCategory && matchesSearch;
      }),
    [activeCategory, allCards, normalizedSearch],
  );

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
    setSessionDeck(drawSession(filteredPool, Date.now()));
    setIndex(0);
    setIsExpanded(false);
  }

  const actionsRef = useRef({
    goNext,
    goPrevious,
    shuffleDeck,
  });

  actionsRef.current = {
    goNext,
    goPrevious,
    shuffleDeck,
  };

  useEffect(() => {
    const persisted = readPersistedFlashcardsState();
    const validIds = new Set(allCards.map((card) => card.id));
    const restoredKnownIds = (persisted?.knownIds ?? []).filter((id) => validIds.has(id));

    setKnownIds(new Set(restoredKnownIds));
    setIsHydrated(true);
  }, [allCards]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    setSessionDeck(drawSession(filteredPool));
    setIndex(0);
    setIsExpanded(false);
  }, [filteredPool, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    writePersistedFlashcardsState({ knownIds: knownIdList });
  }, [isHydrated, knownIdList]);

  useEffect(() => {
    setIsExpanded(false);
  }, [currentCard?.id]);

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
        actionsRef.current.goPrevious();
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        actionsRef.current.goNext();
        return;
      }

      if (event.key === 's' || event.key === 'S') {
        event.preventDefault();
        actionsRef.current.shuffleDeck();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleCategoryChange(category: CategoryFilter): void {
    setActiveCategory(category);
    setIndex(0);
  }

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>): void {
    setSearchQuery(event.target.value);
    setIndex(0);
  }

  function toggleKnown(cardId: string): void {
    setKnownIds((current) => {
      const next = new Set(current);

      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }

      return next;
    });
  }

  function resetAll(): void {
    setActiveCategory('all');
    setSessionDeck(drawSession(allCards, Date.now()));
    setIndex(0);
    setIsExpanded(false);
    setKnownIds(new Set());
    setSearchQuery('');
  }

  const controls = (
    <div className="flashcard-actions" aria-label="Flashcard controls">
      <Button
        aria-label="Previous flashcard"
        disabled={sessionDeck.length < 2}
        icon={<ArrowLeft aria-hidden="true" />}
        onClick={goPrevious}
        tone="secondary"
      >
        Previous
      </Button>
      <Button
        aria-label="Shuffle flashcards"
        disabled={filteredPool.length < 2}
        icon={<Shuffle aria-hidden="true" />}
        onClick={shuffleDeck}
        tone="secondary"
      >
        Shuffle
      </Button>
      <Button
        aria-label="Next flashcard"
        disabled={sessionDeck.length < 2}
        icon={<ArrowRight aria-hidden="true" />}
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
              ? `Card ${safeIndex + 1} of ${sessionDeck.length} — ${remainingCount} of ${
                  sessionDeck.length
                } remaining`
              : '0 of 0 remaining'}
          </p>
        </div>
        <Button
          aria-label="Reset flashcards"
          icon={<RotateCcw aria-hidden="true" />}
          onClick={resetAll}
          size="sm"
          tone="ghost"
        >
          Reset All
        </Button>
      </div>

      <div className="flashcard-toolbar" aria-label="Flashcard filters">
        <label className="flashcard-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Search flashcards</span>
          <input
            aria-label="Search flashcards by title or key point"
            onChange={handleSearchChange}
            placeholder="Search title or key point"
            type="search"
            value={searchQuery}
          />
        </label>

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
                <CheckCircle2 aria-hidden="true" />
                <span>{isCurrentKnown ? 'Known' : 'Mark as Known'}</span>
              </button>

              {isSubset ? <Badge tone="brand">Shuffled</Badge> : null}

              <FlashcardImage card={currentCard} />

              <div className="flashcard-copy">
                <h1 id="flashcards-title">{currentCard.title}</h1>
                <p className="flashcard-key-point">{currentCard.keyPoint ?? currentCard.summary}</p>
              </div>

              <div className="flashcard-detail">
                <button
                  aria-controls={`flashcard-summary-${currentCard.id}`}
                  aria-expanded={isExpanded}
                  className="flashcard-detail__toggle"
                  onClick={() => setIsExpanded((current) => !current)}
                  type="button"
                >
                  <span>Details</span>
                  <ChevronDown aria-hidden="true" />
                </button>
                <div
                  className="flashcard-summary"
                  hidden={!isExpanded}
                  id={`flashcard-summary-${currentCard.id}`}
                >
                  <p>{currentCard.summary}</p>
                </div>
              </div>
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
            <p>Try another category or search term.</p>
          </div>
        )}
      </Card>

      {controls}
    </section>
  );
}

function drawSession(pool: Flashcard[], seed?: number): Flashcard[] {
  if (pool.length === 0) {
    return [];
  }

  if (pool.length <= BATCH_SIZE) {
    return shuffleFlashcards(pool, seed ?? Date.now());
  }

  return shuffleFlashcards(pool, seed ?? Date.now()).slice(0, BATCH_SIZE);
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
