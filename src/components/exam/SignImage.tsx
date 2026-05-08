import Image from 'next/image';
import type { Question } from '@/types/exam';

export function SignImage({
  question,
  compact = false,
}: {
  question: Question;
  compact?: boolean;
}) {
  if (!question.image) {
    return null;
  }

  return (
    <figure
      className={compact ? 'sign-figure sign-figure--compact' : 'sign-figure'}
      data-testid="sign-image"
    >
      <Image
        alt={question.imageAlt ?? 'Road sign for this question'}
        height={compact ? 96 : 180}
        priority={!compact}
        src={question.image}
        unoptimized
        width={compact ? 96 : 180}
      />
    </figure>
  );
}
