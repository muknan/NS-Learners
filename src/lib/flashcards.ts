import rawFlashcards from '@/data/flashcards.json';
import { FlashcardDeckSchema, type Flashcard } from '@/lib/flashcards.schema';

export const flashcards: Flashcard[] = FlashcardDeckSchema.parse(rawFlashcards);

export function getFlashcards(): Flashcard[] {
  return flashcards;
}

export function shuffleFlashcards(
  deck: readonly Flashcard[],
  seed: number | string = Date.now(),
): Flashcard[] {
  const shuffled = [...deck];
  const random = seededRandom(seed);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    const current = shuffled[index];
    const target = shuffled[randomIndex];

    if (current === undefined || target === undefined) {
      continue;
    }

    shuffled[index] = target;
    shuffled[randomIndex] = current;
  }

  return shuffled;
}

function seededRandom(seed: number | string): () => number {
  let state = hashSeed(seed);

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
}

function hashSeed(seed: number | string): number {
  const value = String(seed);
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
