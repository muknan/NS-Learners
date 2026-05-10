import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FlashcardsClient } from '@/components/flashcards/FlashcardsClient';
import type { Flashcard } from '@/lib/flashcards.schema';

const deck: Flashcard[] = [
  {
    id: 'fc-201',
    chapter: "Chapter 1 — Your Driver's Licence",
    title: 'Learner Basics',
    keyPoint: 'Study rules, signs, and safety basics before the Class 7 test.',
    summary: 'Learners start with the core rules, signs, and safety knowledge needed to drive.',
    category: 'rules',
  },
  {
    id: 'fc-202',
    chapter: 'Chapter 2 — Rules of the Road',
    title: 'Crosswalks',
    keyPoint: 'Yield to pedestrians in marked and unmarked crosswalks.',
    summary: 'Drivers must watch for pedestrians and yield at marked and unmarked crosswalks.',
    category: 'safety',
  },
];

describe('FlashcardsClient', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('advances to the next card when Next is clicked', async () => {
    const user = userEvent.setup();

    render(<FlashcardsClient deck={deck} />);

    expect(screen.getByRole('heading', { name: 'Learner Basics' })).toBeInTheDocument();
    expect(screen.getByText('Card 1 of 2 - 2 of 2 remaining')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByRole('heading', { name: 'Crosswalks' })).toBeInTheDocument();
    expect(screen.getByText('Card 2 of 2 - 2 of 2 remaining')).toBeInTheDocument();
  });
});
