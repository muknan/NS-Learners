'use client';

import { useEffect, useState } from 'react';
import type { Question } from '@/types/exam';

export function SignImage({
  question,
  compact = false,
}: {
  question: Question;
  compact?: boolean;
}) {
  const [src, setSrc] = useState(question.image);

  useEffect(() => {
    setSrc(question.image);
  }, [question.image]);

  if (!question.image) {
    return null;
  }

  return (
    <figure
      className={compact ? 'sign-figure sign-figure--compact' : 'sign-figure'}
      data-testid="sign-image"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Native img avoids SVG rendering issues in static export. */}
      <img
        alt={question.imageAlt ?? 'Road sign for this question'}
        decoding="async"
        loading={compact ? 'lazy' : 'eager'}
        onError={() => setSrc('/signs/_unknown.svg')}
        src={src ?? '/signs/_unknown.svg'}
      />
    </figure>
  );
}
