import { describe, expect, it } from 'vitest';
import { shuffleFlashcards } from '@/lib/flashcards';
import type { Flashcard } from '@/lib/flashcards.schema';

const deck: Flashcard[] = [
  {
    id: 'fc-101',
    chapter: "Chapter 1 — Your Driver's Licence",
    title: 'One',
    summary: 'A sample summary long enough for the schema-style data shape.',
    category: 'rules',
  },
  {
    id: 'fc-102',
    chapter: 'Chapter 2 — Rules of the Road',
    title: 'Two',
    summary: 'Another sample summary long enough for deterministic shuffle tests.',
    category: 'safety',
  },
  {
    id: 'fc-103',
    chapter: 'Chapter 3 — Signs, Pavement Markings and Work Zones',
    title: 'Three',
    summary: 'A third sample summary long enough to make the fake deck useful.',
    category: 'signs',
  },
  {
    id: 'fc-104',
    chapter: 'Chapter 4 — Safety',
    title: 'Four',
    summary: 'A fourth sample summary long enough for a stable expected order.',
    category: 'general',
  },
];

describe('shuffleFlashcards', () => {
  it('returns the same order for the same seed without mutating the original deck', () => {
    const first = shuffleFlashcards(deck, 'study-seed').map((card) => card.id);
    const second = shuffleFlashcards(deck, 'study-seed').map((card) => card.id);

    expect(first).toEqual(second);
    expect(first).not.toEqual(deck.map((card) => card.id));
    expect(deck.map((card) => card.id)).toEqual(['fc-101', 'fc-102', 'fc-103', 'fc-104']);
  });
});
