'use client';

import { Info } from 'lucide-react';
import { AnswerOption } from '@/components/exam/AnswerOption';
import { SignImage } from '@/components/exam/SignImage';
import { Badge } from '@/components/ui/Badge';
import type { AnswerOption as AnswerOptionValue, ExamSession, Question } from '@/types/exam';
import { getOrderedOptions } from '@/lib/session';
import { getTopicLabel } from '@/lib/questions';
import { useEffect, useRef } from 'react';

interface ExamCardProps {
  session: ExamSession;
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  instantFeedback: boolean;
  onAnswer: (optionId: AnswerOptionValue['id']) => void;
}

export function ExamCard({
  session,
  question,
  questionIndex,
  totalQuestions,
  instantFeedback,
  onAnswer,
}: ExamCardProps) {
  const selectedId = session.answers[question.id] ?? null;
  const showFeedback = instantFeedback && selectedId !== null && session.phase === 'review';
  const orderedOptions = getOrderedOptions(question, session);
  const feedbackRef = useRef<HTMLDetailsElement>(null);
  const hasImage = Boolean(question.image);

  useEffect(() => {
    if (showFeedback) {
      feedbackRef.current?.focus();
    }
  }, [showFeedback, question.id]);

  return (
    <article className={hasImage ? 'exam-card exam-card--with-image' : 'exam-card'}>
      {hasImage ? (
        <div className="exam-card__image-pane">
          <SignImage question={question} />
        </div>
      ) : null}

      <div className="exam-card__content-pane">
        <div className="exam-card__meta">
          <span>{getTopicLabel(question.topic)}</span>
          <Badge className="exam-card__difficulty" tone={getDifficultyTone(question.difficulty)}>
            {question.difficulty}
          </Badge>
          <span aria-hidden="true">·</span>
          <span>
            Q {questionIndex + 1} / {totalQuestions}
          </span>
        </div>

        <h1 className="exam-question" data-testid="exam-question" tabIndex={-1}>
          {question.text}
        </h1>

        <div className="answer-list" role="radiogroup" aria-label="Answer choices">
          {orderedOptions.map((option, index) => (
            <AnswerOption
              correct={option.id === question.correctId}
              disabled={showFeedback}
              index={index}
              key={option.id}
              onSelect={() => onAnswer(option.id)}
              option={option}
              selected={selectedId === option.id}
              showFeedback={showFeedback}
              wrong={showFeedback && selectedId === option.id && option.id !== question.correctId}
            />
          ))}
        </div>
      </div>

      {showFeedback ? (
        <details className="explanation-panel" ref={feedbackRef} tabIndex={-1} open>
          <summary>
            <Info aria-hidden="true" />
            Explanation
          </summary>
          <p>{question.explanation}</p>
          {question.handbookSection ? <small>{question.handbookSection}</small> : null}
        </details>
      ) : null}
    </article>
  );
}

function getDifficultyTone(difficulty: Question['difficulty']): 'neutral' | 'warning' | 'error' {
  switch (difficulty) {
    case 'hard':
      return 'error';
    case 'medium':
      return 'warning';
    case 'easy':
      return 'neutral';
  }
}
