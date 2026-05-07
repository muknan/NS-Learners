import nextDynamic from 'next/dynamic';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { questions } from '@/lib/questions';

export const dynamic = 'force-static';

const ResultsClient = nextDynamic(() =>
  import('@/components/results/ResultsClient').then((module) => module.ResultsClient),
);

export default function ResultsPage() {
  return (
    <PageWrapper>
      <ResultsClient questions={questions} />
    </PageWrapper>
  );
}
