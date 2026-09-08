import { PageWrapper } from '@/components/layout/PageWrapper';
import { ReviewClient } from '@/components/review/ReviewClient';

export const metadata = {
  title: 'Review — NS Learner Test Practice',
  description: 'Revisit mistakes and questions you saved while practising.',
};

export default function ReviewPage() {
  return (
    <PageWrapper>
      <ReviewClient />
    </PageWrapper>
  );
}
