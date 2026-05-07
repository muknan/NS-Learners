import type { ExamSession } from '@/types/exam';

export function useProgress(session: ExamSession): {
  answered: number;
  total: number;
  percentage: number;
} {
  const answered = session.questionIds.filter((questionId) => session.answers[questionId]).length;
  const total = session.questionIds.length;

  return {
    answered,
    total,
    percentage: total ? Math.round((answered / total) * 100) : 0,
  };
}
