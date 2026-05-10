'use client';

import { useEffect, useState } from 'react';
import type { Flashcard } from '@/lib/flashcards.schema';

export function FlashcardImage({ card }: { card: Flashcard }) {
  const [src, setSrc] = useState(card.image);

  useEffect(() => {
    setSrc(card.image);
  }, [card.image]);

  if (!card.image) {
    return null;
  }

  return (
    <figure className="flashcard-image" data-testid="flashcard-image">
      {/* eslint-disable-next-line @next/next/no-img-element -- Native img keeps static sign assets reliable. */}
      <img
        alt={card.imageAlt ?? 'Road sign for this flashcard'}
        decoding="async"
        height={180}
        loading="eager"
        onError={() => setSrc('/signs/_unknown.svg')}
        src={src ?? '/signs/_unknown.svg'}
        width={180}
      />
    </figure>
  );
}
