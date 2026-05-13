import nextDynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Badge } from '@/components/ui/Badge';
import { questions } from '@/lib/questions';

export const metadata = {
  title: 'Practice Exam — NS Learner Test Practice',
  description:
    'Take a timed Nova Scotia Class 7 learner test practice exam with instant or end-of-exam feedback.',
};

export const dynamic = 'force-static';

const ExamClient = nextDynamic(() =>
  import('@/components/exam/ExamClient').then((module) => module.ExamClient),
);

export default function ExamPage() {
  return (
    <main id="main-content" className="exam-page-shell">
      <Suspense fallback={<ExamLoadingFallback />}>
        <ExamClient questions={questions} />
      </Suspense>
    </main>
  );
}

function ExamLoadingFallback() {
  return (
    <section className="loading-state" role="status">
      <Badge tone="brand">Loading</Badge>
      <h1>Preparing your practice exam.</h1>
      <p>Did you know? Learners in Nova Scotia must maintain zero blood alcohol level.</p>
    </section>
  );
}
