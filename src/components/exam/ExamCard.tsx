'use client';

import { ArrowLeft, ArrowRight, Flag, Info, Send } from 'lucide-react';
import { AnswerOption } from '@/components/exam/AnswerOption';
import { SignImage } from '@/components/exam/SignImage';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import type { AnswerOption as AnswerOptionValue, ExamSession, Question } from '@/types/exam';
import { getOrderedOptions } from '@/lib/session';
import { getTopicLabel } from '@/lib/questions';
import { useEffect, useRef, type CSSProperties } from 'react';

interface ExamCardProps {
  session: ExamSession;
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  autoAdvanceActive: boolean;
  autoAdvanceDurationMs: number;
  instantFeedback: boolean;
  autoAdvance: boolean;
  onAnswer: (optionId: AnswerOptionValue['id']) => void;
  onFlag: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: () => void;
  onToggleInstantFeedback: (value: boolean) => void;
  onToggleAutoAdvance: (value: boolean) => void;
}

export function ExamCard({
  session,
  question,
  questionIndex,
  totalQuestions,
  autoAdvanceActive,
  autoAdvanceDurationMs,
  instantFeedback,
  autoAdvance,
  onAnswer,
  onFlag,
  onNext,
  onPrevious,
  onSubmit,
  onToggleInstantFeedback,
  onToggleAutoAdvance,
}: ExamCardProps) {
  const selectedId = session.answers[question.id] ?? null;
  const showFeedback = instantFeedback && selectedId !== null && session.phase === 'review';
  const orderedOptions = getOrderedOptions(question, session);
  const isLast = questionIndex === totalQuestions - 1;
  const flagged = session.flaggedIds.includes(question.id);
  const toggleHint = getToggleHint(instantFeedback, autoAdvance, autoAdvanceDurationMs);
  const feedbackRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (showFeedback) {
      feedbackRef.current?.focus();
    }
  }, [showFeedback, question.id]);

  return (
    <article className="exam-card">
      <header className="exam-card__header">
        <div>
          <Badge tone="brand">{getTopicLabel(question.topic)}</Badge>
          <p>
            Question {questionIndex + 1} of {totalQuestions}
          </p>
        </div>
      </header>

      <SignImage question={question} />

      <h1 tabIndex={-1}>{question.text}</h1>

      <div className="answer-list" role="list" aria-label="Answer choices">
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

      {showFeedback ? (
        <details className="explanation-panel" ref={feedbackRef} tabIndex={-1} open>
          <summary>
            <Info aria-hidden="true" suppressHydrationWarning />
            Explanation
          </summary>
          <p>{question.explanation}</p>
          {question.handbookSection ? <small>{question.handbookSection}</small> : null}
        </details>
      ) : null}

      <footer className="exam-card__footer">
        <div className="exam-card__toggle-area">
          <div className="exam-card__toggles">
            <ToggleSwitch
              id="instant-feedback-toggle"
              label="Instant feedback"
              checked={instantFeedback}
              onChange={onToggleInstantFeedback}
            />
            <ToggleSwitch
              id="auto-advance-toggle"
              label="Auto-advance"
              checked={autoAdvance}
              onChange={onToggleAutoAdvance}
            />
          </div>
          {toggleHint ? <p className="exam-card__toggle-hint">{toggleHint}</p> : null}
        </div>
        <div className="exam-card__actions">
          {questionIndex > 0 ? (
            <Button
              tone="secondary"
              icon={<ArrowLeft aria-hidden="true" suppressHydrationWarning />}
              onClick={onPrevious}
            >
              Prev
            </Button>
          ) : null}
          <Button
            aria-pressed={flagged}
            icon={<Flag aria-hidden="true" suppressHydrationWarning />}
            onClick={onFlag}
            tone={flagged ? 'secondary' : 'ghost'}
          >
            {flagged ? 'Flagged' : 'Flag'}
          </Button>
          {isLast ? (
            <Button icon={<Send aria-hidden="true" suppressHydrationWarning />} onClick={onSubmit}>
              Submit
            </Button>
          ) : (
            <Button
              className="next-button"
              icon={<ArrowRight aria-hidden="true" suppressHydrationWarning />}
              onClick={onNext}
              style={{ '--advance-duration': `${autoAdvanceDurationMs}ms` } as CSSProperties}
            >
              Next{autoAdvanceActive ? <span className="next-button__countdown" /> : null}
            </Button>
          )}
        </div>
      </footer>
    </article>
  );
}

function getToggleHint(
  instantFeedback: boolean,
  autoAdvance: boolean,
  autoAdvanceDurationMs: number,
): string {
  if (autoAdvance) {
    return `Auto-advancing in ${autoAdvanceDurationMs / 1000}s after each answer`;
  }

  if (instantFeedback) {
    return 'Tap Next to continue after each answer';
  }

  return '';
}
