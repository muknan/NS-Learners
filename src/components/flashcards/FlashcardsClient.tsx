'use client';

import { ArrowLeft, ArrowRight, Shuffle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { shuffleFlashcards } from '@/lib/flashcards';
import type { Flashcard, FlashcardCategory } from '@/lib/flashcards.schema';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const categoryTone: Record<FlashcardCategory, 'brand' | 'neutral' | 'warning' | 'success'> = {
  general: 'brand',
  rules: 'neutral',
  signs: 'warning',
  safety: 'success',
};

export function FlashcardsClient({ deck }: { deck: Flashcard[] }) {
  const initialDeck = useMemo(() => deck, [deck]);
  const [cards, setCards] = useState<Flashcard[]>(initialDeck);
  const [index, setIndex] = useState(0);
  const currentCard = cards[index] ?? cards[0];

  function goPrevious(): void {
    setIndex((current) => (current === 0 ? cards.length - 1 : current - 1));
  }

  function goNext(): void {
    setIndex((current) => (current + 1) % cards.length);
  }

  function shuffleDeck(): void {
    setCards(shuffleFlashcards(cards, Date.now()));
    setIndex(0);
  }

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
        goPrevious();
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
        return;
      }

      if (event.key === 's' || event.key === 'S') {
        event.preventDefault();
        shuffleDeck();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!currentCard) {
    return null;
  }

  return (
    <section className="flashcards-layout" aria-labelledby="flashcards-title">
      <div className="flashcards-heading">
        <Badge tone="brand">Flashcards</Badge>
        <p className="flashcards-progress" aria-live="polite">
          Card {index + 1} of {cards.length}
        </p>
      </div>

      <Card className="flashcard-view">
        <Badge tone={categoryTone[currentCard.category]}>{currentCard.chapter}</Badge>
        <h1 id="flashcards-title">{currentCard.title}</h1>
        <p>{currentCard.summary}</p>
      </Card>

      <div className="flashcard-actions" aria-label="Flashcard controls">
        <Button tone="secondary" icon={<ArrowLeft aria-hidden="true" />} onClick={goPrevious}>
          Previous
        </Button>
        <Button tone="secondary" icon={<Shuffle aria-hidden="true" />} onClick={shuffleDeck}>
          Shuffle
        </Button>
        <Button icon={<ArrowRight aria-hidden="true" />} onClick={goNext}>
          Next
        </Button>
      </div>
    </section>
  );
}
