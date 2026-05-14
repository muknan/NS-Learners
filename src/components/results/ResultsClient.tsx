'use client';

import { Clipboard, RotateCcw, Target, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SignImage } from '@/components/exam/SignImage';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ToastViewport, type ToastMessage } from '@/components/ui/Toast';
import { getExamMode } from '@/lib/modes';
import { getTopicLabel } from '@/lib/questions';
import {
  buildShareSummary,
  getMissedQuestionIds,
  getQuestionResults,
  scoreSession,
} from '@/lib/scoring';
import { createExamSession } from '@/lib/session';
import {
  RETAKE_QUESTIONS_KEY,
  localSet,
  readCompletedSession,
  readHistorySession,
  readSettings,
  saveSessionForMode,
} from '@/lib/storage';
import { nextToastId } from '@/lib/toast';
import type { ExamSession, Question, QuestionResult } from '@/types/exam';

export function ResultsClient({
  questions,
  historyId,
}: {
  questions: Question[];
  historyId: string | undefined;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<ExamSession | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const questionsById = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions],
  );
  const score = useMemo(
    () => (session ? scoreSession(session, questionsById, session.mode) : null),
    [questionsById, session],
  );
  const results = useMemo(
    () => (session ? getQuestionResults(session, questionsById) : []),
    [questionsById, session],
  );
  const missed = useMemo(() => results.filter((result) => !result.isCorrect), [results]);
  const lowestTopics = useMemo(
    () =>
      score
        ? [...score.byTopic]
            .filter((topic) => topic.correct > 0 || topic.percentage > 0)
            .sort((left, right) => left.percentage - right.percentage)
            .slice(0, 8)
        : [],
    [score],
  );

  useEffect(() => {
    if (historyId) {
      setSession(readHistorySession(historyId));
    } else {
      setSession(readCompletedSession());
    }
  }, [historyId]);

  const dismissToast = useCallback((id: string): void => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string): void => {
    setToasts((current) => [
      ...current,
      {
        id: nextToastId(),
        message,
        type: 'success',
      },
    ]);
  }, []);

  if (!session || !score) {
    return (
      <section className="empty-exam">
        <Badge tone="warning">No result</Badge>
        <h1>No completed exam found.</h1>
        <p>
          Results are only stored after submitting an exam in this browser tab. If you completed an
          exam in another tab, results won&apos;t be available here.
        </p>
        <div className="stats-row">
          <ButtonLink href="/exam?mode=full-test">Start a new exam</ButtonLink>
          <ButtonLink href="/" tone="ghost">
            Go to Home
          </ButtonLink>
        </div>
      </section>
    );
  }

  const completedSession = session;
  const expired = searchParams.get('expired') === '1';

  async function shareResult(): Promise<void> {
    try {
      await navigator.clipboard.writeText(buildShareSummary(completedSession, questionsById));
      addToast('Copied to clipboard');
    } catch {
      setToasts((current) => [
        ...current,
        {
          id: nextToastId(),
          message: 'Clipboard unavailable',
          type: 'error',
        },
      ]);
    }
  }

  function retakeMissed(): void {
    const missedIds = getMissedQuestionIds(completedSession, questionsById);

    if (!missedIds.length) {
      return;
    }

    localSet(RETAKE_QUESTIONS_KEY, missedIds.join(','));
    const nextSession = createExamSession({
      questions,
      settings: {
        ...readSettings(),
        questionCount: 'all',
        instantFeedback: true,
        autoAdvance: false,
      },
      source: 'missed',
      questionIds: missedIds,
      mode: 'retake',
    });

    saveSessionForMode(nextSession);
    router.push('/exam?mode=retake');
  }

  return (
    <div className="results-layout">
      <section className="results-hero">
        <div>
          {score.passed === null ? (
            <Badge tone="brand">Score</Badge>
          ) : (
            <Badge tone={score.passed ? 'success' : 'error'}>
              {score.passed ? 'Pass' : 'Fail'}
            </Badge>
          )}
          <h1>{getExamMode(completedSession.mode).label}</h1>
          <p>
            {score.correct}/{score.total} correct overall
            {expired ? ' after the timer expired.' : '.'}
          </p>
        </div>
        <ScoreRing
          percentage={score.percentage}
          correct={score.correct}
          incorrect={score.incorrect}
          missed={score.missed}
          total={score.total}
          label={`${score.percentage}% score`}
        />
      </section>

      <section className="section-block" aria-labelledby="breakdown-title">
        <div className="section-heading">
          <Badge tone="brand">Breakdown</Badge>
          <h2 id="breakdown-title">Score by topic section.</h2>
        </div>
        <div className="breakdown-grid">
          {score.bySection.map((section) => (
            <article className="breakdown-item" key={section.section}>
              <div>
                <strong>{section.section}</strong>
                <span>
                  {section.correct}/{section.total}
                </span>
              </div>
              <ProgressBar
                value={section.percentage}
                label={`${section.section} score`}
                correct={section.correct}
                incorrect={section.incorrect}
                missed={section.missed}
                total={section.total}
              />
            </article>
          ))}
          {score.byCategory.map((category) => (
            <article className="breakdown-item" key={category.category}>
              <div>
                <strong>{category.category === 'rules' ? 'Road rules' : 'Road signs'}</strong>
                <span>
                  {category.correct}/{category.total}
                </span>
              </div>
              <ProgressBar
                value={category.percentage}
                label={`${category.category} category score`}
                correct={category.correct}
                incorrect={category.incorrect}
                missed={category.missed}
                total={category.total}
              />
            </article>
          ))}
        </div>
        {lowestTopics.length ? (
          <div className="breakdown-subsection">
            <h3>Lowest topic scores</h3>
            <div className="breakdown-grid">
              {lowestTopics.map((topic) => (
                <article className="breakdown-item" key={topic.topic}>
                  <div>
                    <strong>{getTopicLabel(topic.topic)}</strong>
                    <span>
                      {topic.correct}/{topic.total}
                    </span>
                  </div>
                  <ProgressBar
                    value={topic.percentage}
                    label={`${topic.topic} topic score`}
                    correct={topic.correct}
                    incorrect={topic.incorrect}
                    missed={topic.missed}
                    total={topic.total}
                  />
                </article>
              ))}
            </div>
          </div>
        ) : score?.percentage === 100 ? (
          <div className="breakdown-subsection">
            <p className="empty-state">Perfect score by topic!</p>
          </div>
        ) : null}
      </section>

      <section className="results-actions" aria-label="Result actions">
        <Button
          disabled={!missed.length}
          icon={<Target aria-hidden="true" />}
          onClick={retakeMissed}
        >
          Retake missed only
        </Button>
        <ButtonLink
          href="/exam?mode=full-test"
          tone="secondary"
          icon={<RotateCcw aria-hidden="true" />}
        >
          Retake full exam
        </ButtonLink>
        <Button tone="ghost" icon={<Clipboard aria-hidden="true" />} onClick={shareResult}>
          Copy result summary
        </Button>
      </section>

      <section className="section-block wrong-answer-print" aria-labelledby="missed-title">
        <div className="section-heading">
          <Badge tone={missed.length ? 'error' : 'success'}>{missed.length} missed</Badge>
          <h2 id="missed-title">Wrong answer review.</h2>
        </div>
        {missed.length ? (
          <WrongAnswerList results={missed} />
        ) : (
          <p className="empty-state">No missed questions.</p>
        )}
      </section>
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function ScoreRing({
  percentage,
  correct,
  incorrect,
  missed,
  total,
  label,
}: {
  percentage: number;
  correct: number;
  incorrect: number;
  missed: number;
  total: number;
  label: string;
}) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const titleId = `score-ring-title-${percentage}`;

  function arcProps(count: number, startCount: number) {
    if (total === 0) return {};
    const dashLength = (count / total) * circumference;
    const startOffset = (startCount / total) * circumference;
    return {
      strokeDasharray: `${dashLength} ${circumference - dashLength}`,
      strokeDashoffset: -startOffset,
    };
  }

  return (
    <div className="score-ring" role="img" aria-labelledby={titleId}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <title id={titleId}>
          {label} — {correct} correct, {incorrect} wrong, {missed} missed of {total}
        </title>
        <circle className="score-ring__track" cx="60" cy="60" r={radius} />
        {correct > 0 && (
          <circle
            className="score-ring__segment score-ring__segment--correct"
            cx="60"
            cy="60"
            r={radius}
            strokeLinecap="butt"
            {...arcProps(correct, 0)}
          />
        )}
        {incorrect > 0 && (
          <circle
            className="score-ring__segment score-ring__segment--incorrect"
            cx="60"
            cy="60"
            r={radius}
            strokeLinecap="butt"
            {...arcProps(incorrect, correct)}
          />
        )}
        {missed > 0 && (
          <circle
            className="score-ring__segment score-ring__segment--missed"
            cx="60"
            cy="60"
            r={radius}
            strokeLinecap="butt"
            {...arcProps(missed, correct + incorrect)}
          />
        )}
      </svg>
      <strong>{percentage}%</strong>
      <span>Score</span>
    </div>
  );
}

function WrongAnswerList({ results }: { results: QuestionResult[] }) {
  return (
    <div className="wrong-list">
      {results.map((result) => (
        <article className="wrong-item" key={result.question.id}>
          {result.question.image ? (
            <SignImage compact question={result.question} />
          ) : (
            <div className="wrong-item__placeholder" aria-hidden="true" />
          )}
          <div>
            <p className="wrong-item__topic">
              {result.question.category === 'rules' ? 'Rules' : 'Signs'} ·{' '}
              {getTopicLabel(result.question.topic)}
            </p>
            <h3>{result.question.text}</h3>
            <div className="answer-comparison">
              <span className="is-wrong">
                <X aria-hidden="true" />
                Your answer: {result.selectedText ?? 'No answer'}
              </span>
              <span className="is-correct">Correct answer: {result.correctText}</span>
            </div>
            <details className="explanation-panel">
              <summary>Explanation</summary>
              <p>{result.question.explanation}</p>
              {result.question.handbookSection ? (
                <small>{result.question.handbookSection}</small>
              ) : null}
            </details>
          </div>
        </article>
      ))}
    </div>
  );
}
