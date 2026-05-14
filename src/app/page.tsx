import { Suspense } from 'react';
import { HomeClient } from '@/components/home/HomeClient';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { getFlashcards } from '@/lib/flashcards';
import { getQuestionStats } from '@/lib/questions';

export const dynamic = 'force-static';

export default function HomePage() {
  return (
    <PageWrapper>
      <Suspense fallback={null}>
        <HomeClient flashcardTotal={getFlashcards().length} stats={getQuestionStats()} />
      </Suspense>
    </PageWrapper>
  );
}
