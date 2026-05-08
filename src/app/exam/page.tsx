import nextDynamic from 'next/dynamic';
import { questions } from '@/lib/questions';

export const dynamic = 'force-static';

const ExamClient = nextDynamic(() =>
  import('@/components/exam/ExamClient').then((module) => module.ExamClient),
);

export default function ExamPage() {
  return (
    <main id="main-content" className="exam-page-shell">
      <ExamClient questions={questions} />
    </main>
  );
}
