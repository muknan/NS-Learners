import { Check, Flag, X } from 'lucide-react';
import type { ExamSession, Question } from '@/types/exam';

interface QuestionNavProps {
  session: ExamSession;
  questionsById: Map<string, Question>;
  onSelect: (index: number) => void;
}

export function QuestionNav({ session, questionsById, onSelect }: QuestionNavProps) {
  return (
    <nav className="question-nav" aria-label="Question navigator">
      {session.questionIds.map((questionId, index) => {
        const question = questionsById.get(questionId);
        const selected = session.answers[questionId];
        const flagged = session.flaggedIds.includes(questionId);
        const reviewable =
          (session.instantFeedback || session.phase === 'complete') && Boolean(selected);
        const correct = reviewable && selected === question?.correctId;
        const wrong = reviewable && selected !== question?.correctId;

        return (
          <button
            aria-current={session.currentIndex === index ? 'true' : undefined}
            className={[
              'question-nav__item',
              session.currentIndex === index ? 'is-current' : '',
              selected ? 'is-answered' : '',
              flagged ? 'is-flagged' : '',
              correct ? 'is-correct' : '',
              wrong ? 'is-wrong' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            key={questionId}
            onClick={() => onSelect(index)}
            type="button"
          >
            <span>{index + 1}</span>
            {flagged ? <Flag aria-hidden="true" /> : null}
            {correct ? <Check aria-hidden="true" /> : null}
            {wrong ? <X aria-hidden="true" /> : null}
            <span className="sr-only">
              {selected ? ', answered' : ', unanswered'}
              {flagged ? ', flagged' : ''}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
