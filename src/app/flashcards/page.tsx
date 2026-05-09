import { FlashcardsClient } from '@/components/flashcards/FlashcardsClient';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { getFlashcards } from '@/lib/flashcards';

export const metadata = {
  title: 'Flashcards — NS Learner Test Practice',
  description: 'Quick Nova Scotia learner test study cards covering every handbook chapter.',
};

export const dynamic = 'force-static';

export default function FlashcardsPage() {
  return (
    <PageWrapper>
      <FlashcardsClient deck={getFlashcards()} />
    </PageWrapper>
  );
}
