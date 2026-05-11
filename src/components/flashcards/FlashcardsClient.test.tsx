import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

const largeDeck: Flashcard[] = Array.from({ length: 45 }, (_, index) => ({
  id: `fc-large-${index + 1}`,
  chapter: 'Chapter 2 — Rules of the Road',
  title: `Practice Card ${index + 1}`,
  keyPoint: `Key point ${index + 1}`,
  summary: `Summary ${index + 1}`,
  category: index % 2 === 0 ? 'rules' : 'safety',
}));

const STORAGE_KEY = 'ns-learners.flashcards.v2';

describe('FlashcardsClient', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('advances to the next card when Next is clicked', async () => {
    const user = userEvent.setup();

    render(<FlashcardsClient deck={deck} />);

    expect(await screen.findByText('Card 1 of 2 — 2 of 2 remaining')).toBeInTheDocument();
    const firstTitle = screen.getByRole('heading', { level: 1 }).textContent;

    await user.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByText('Card 2 of 2 — 2 of 2 remaining')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).not.toHaveTextContent(firstTitle ?? ''),
    );
  });

  it('shows all marked cards on the Known tab', async () => {
    const user = userEvent.setup();

    render(<FlashcardsClient deck={deck} />);

    await screen.findByText('Card 1 of 2 — 2 of 2 remaining');
    const firstTitle = screen.getByRole('heading', { level: 1 }).textContent;
    await user.click(screen.getByRole('button', { name: /mark .* as known/i }));
    await user.click(screen.getByRole('button', { name: /next flashcard/i }));
    const secondTitle = screen.getByRole('heading', { level: 1 }).textContent;
    await user.click(screen.getByRole('button', { name: /mark .* as known/i }));

    await user.click(screen.getAllByRole('button', { name: /^known$/i })[0]!);

    expect(screen.getByText('Card 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /shuffle flashcards/i })).toBeDisabled();
    expect(screen.queryByText('Shuffled')).not.toBeInTheDocument();
    expect([firstTitle, secondTitle]).toContain(
      screen.getByRole('heading', { level: 1 }).textContent,
    );
  });

  it('excludes the previous batch when shuffling with enough unseen cards', async () => {
    const user = userEvent.setup();

    render(<FlashcardsClient deck={largeDeck} />);

    await screen.findByText('Card 1 of 20 — 20 of 20 remaining');
    const previousTitles = await collectVisibleBatch(user);

    await user.click(screen.getByRole('button', { name: /shuffle flashcards/i }));

    await screen.findByText('Card 1 of 20 — 20 of 20 remaining');
    const nextTitles = await collectVisibleBatch(user);

    expect(nextTitles.every((title) => !previousTitles.includes(title))).toBe(true);
  });

  it('clears known flashcards when Reset All is clicked', async () => {
    const user = userEvent.setup();

    render(<FlashcardsClient deck={deck} />);

    await screen.findByText('Card 1 of 2 — 2 of 2 remaining');
    await user.click(screen.getByRole('button', { name: /mark .* as known/i }));
    await waitFor(() => expect(readKnownIds()).toHaveLength(1));

    await user.click(screen.getByRole('button', { name: /reset flashcards/i }));

    await waitFor(() => expect(readKnownIds()).toHaveLength(0));
  });
});

async function collectVisibleBatch(user: ReturnType<typeof userEvent.setup>): Promise<string[]> {
  const titles: string[] = [];

  for (let index = 0; index < 20; index += 1) {
    titles.push(screen.getByRole('heading', { level: 1 }).textContent ?? '');

    if (index < 19) {
      await user.click(screen.getByRole('button', { name: /next flashcard/i }));
    }
  }

  return titles;
}

function readKnownIds(): string[] {
  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  if (!rawValue) return [];

  const parsed = JSON.parse(rawValue) as { knownIds?: string[] };
  return parsed.knownIds ?? [];
}
