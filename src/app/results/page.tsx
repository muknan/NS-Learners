import nextDynamic from 'next/dynamic';
import { Suspense } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Badge } from '@/components/ui/Badge';
import { questions } from '@/lib/questions';

export const metadata = {
  title: 'Exam Results — NS Learner Test Practice',
  description:
    'Review your Nova Scotia Class 7 learner test practice results, topic breakdowns, and retake missed questions.',
};

export const dynamic = 'force-static';

const ResultsClient = nextDynamic(() =>
  import('@/components/results/ResultsClient').then((module) => module.ResultsClient),
);

export default function ResultsPage() {
  return (
    <PageWrapper>
      <Suspense fallback={<Badge tone="brand">Loading results</Badge>}>
        <ResultsClient questions={questions} />
      </Suspense>
    </PageWrapper>
  );
}
