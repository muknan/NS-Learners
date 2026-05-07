import nextDynamic from 'next/dynamic';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { questions } from '@/lib/questions';

export const dynamic = 'force-static';

const ExamClient = nextDynamic(() =>
  import('@/components/exam/ExamClient').then((module) => module.ExamClient),
);

export default function ExamPage() {
  return (
    <PageWrapper>
      <ExamClient questions={questions} />
    </PageWrapper>
  );
}
