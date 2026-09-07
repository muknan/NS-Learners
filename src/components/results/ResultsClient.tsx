'use client';

import { Clipboard, RotateCcw, Target, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SignImage } from '@/components/exam/SignImage';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
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
  readCompletedSession,
  readHistorySession,
  readSettings,
  readSessionForMode,
  saveSessionForMode,
} from '@/lib/storage';
import { nextToastId } from '@/lib/toast';
import type { ExamSession, Question, QuestionResult } from '@/types/exam';

export function ResultsClient({ questions }: { questions: Question[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const historyId = searchParams.get('historyId');
  const [loaded, setLoaded] = useState(false);
  const [retakeChoiceOpen, setRetakeChoiceOpen] = useState(false);
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
            .filter((topic) => topic.percentage < 100)
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
    setLoaded(true);
  }, [historyId]);

  const dismissToast = useCallback((id: string): void => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: 'success' | 'error' = 'success'): void => {
    setToasts((current) => [
      ...current,
      {
        id: nextToastId(),
        message,
        type,
      },
    ]);
  }, []);

  if (!loaded) return <p role="status">Loading your result…</p>;

  if (!session || !score) {
    return (
      <section className="empty-exam">
        <Badge tone="warning">No result</Badge>
        <h1>No completed exam found.</h1>
        <p>
          No saved result is available for this attempt in this browser. Submit an exam to save its
          result, or choose an available attempt from recent scores.
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

  async function retakeMissed(replaceSaved = false): Promise<void> {
    const missedIds = getMissedQuestionIds(completedSession, questionsById);

    if (!missedIds.length) {
      return;
    }

    if (!navigator.locks) {
      addToast('Use a current browser over HTTPS to start a retake.', 'error');
      return;
    }
    await navigator.locks
      .request('ns-exam-mode-retake', { ifAvailable: true }, (lock) => {
        if (!lock) {
          addToast('A retake is already open in another tab. Finish or close it first.', 'error');
          return;
        }
        if (readSessionForMode('retake') && !replaceSaved) {
          setRetakeChoiceOpen(true);
          return;
        }
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

        if (!saveSessionForMode(nextSession)) {
          addToast('Could not save the retake. Free browser storage and try again.', 'error');
          return;
        }
        router.push('/exam?mode=retake');
      })
      .catch(() =>
        addToast('Could not start the retake. Check browser storage access and retry.', 'error'),
      );
  }

  return (
    <div className="results-layout">
      <section className="results-hero" aria-labelledby="results-title">
        <div className="results-hero__status">
          {score.passed === null ? (
            <Badge tone="brand">Score</Badge>
          ) : (
            <Badge tone={score.passed ? 'success' : 'error'}>
              {score.passed ? 'Pass' : 'Fail'}
            </Badge>
          )}
          {expired && <span className="results-hero__expired">Time expired</span>}
        </div>

        <ScoreRing
          percentage={score.percentage}
          correct={score.correct}
          incorrect={score.incorrect}
          missed={score.missed}
          total={score.total}
          passed={score.passed}
          label={`${score.percentage}% score`}
        />

        <div className="results-hero__copy">
          <h1 id="results-title">{getExamMode(completedSession.mode).label}</h1>
          <p>
            {score.correct} of {score.total} correct overall
            {expired ? ' — time expired' : ''}
          </p>
        </div>

        <div className="results-hero__stats" aria-label="Score breakdown">
          <span className="results-hero__stat results-hero__stat--correct">
            <span className="results-hero__stat-dot" aria-hidden="true" />
            <strong>{score.correct}</strong>
            <span>Correct</span>
          </span>
          <span className="results-hero__stat-divider" aria-hidden="true" />
          <span className="results-hero__stat results-hero__stat--wrong">
            <span className="results-hero__stat-dot" aria-hidden="true" />
            <strong>{score.incorrect}</strong>
            <span>Wrong</span>
          </span>
          <span className="results-hero__stat-divider" aria-hidden="true" />
          <span className="results-hero__stat results-hero__stat--missed">
            <span className="results-hero__stat-dot" aria-hidden="true" />
            <strong>{score.missed}</strong>
            <span>Unanswered</span>
          </span>
        </div>
      </section>

      <section className="section-block" aria-labelledby="breakdown-title">
        <div className="section-heading">
          <Badge tone="brand">Breakdown</Badge>
          <h2 id="breakdown-title">Score by section</h2>
        </div>
        <div className="breakdown-grid">
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
          onClick={() => void retakeMissed()}
        >
          Retake missed only
        </Button>
        <ButtonLink
          href="/exam?mode=full-test"
          tone="secondary"
          icon={<RotateCcw aria-hidden="true" />}
        >
          {readSessionForMode('full-test') ? 'Resume full exam' : 'Start full exam'}
        </ButtonLink>
        <Button tone="ghost" icon={<Clipboard aria-hidden="true" />} onClick={shareResult}>
          Copy result summary
        </Button>
      </section>

      <section className="section-block wrong-answer-print" aria-labelledby="missed-title">
        <div className="section-heading">
          <Badge tone={missed.length ? 'error' : 'success'}>{missed.length} to review</Badge>
          <h2 id="missed-title">Wrong answer review.</h2>
        </div>
        {missed.length ? (
          <WrongAnswerList results={missed} />
        ) : (
          <p className="empty-state">No missed questions.</p>
        )}
      </section>
      {retakeChoiceOpen ? (
        <Modal title="You have a saved retake" onClose={() => setRetakeChoiceOpen(false)}>
          <div className="submit-warning">
            <p>
              Resume your saved retake, or replace it with the missed questions from this result.
            </p>
          </div>
          <footer className="modal__footer exit-actions">
            <Button onClick={() => router.push('/exam?mode=retake')}>Resume saved retake</Button>
            <Button tone="secondary" onClick={() => setRetakeChoiceOpen(false)}>
              Cancel
            </Button>
            <Button tone="danger" onClick={() => void retakeMissed(true)}>
              Replace saved retake
            </Button>
          </footer>
        </Modal>
      ) : null}
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
  passed,
  label,
}: {
  percentage: number;
  correct: number;
  incorrect: number;
  missed: number;
  total: number;
  passed: boolean | null;
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
    <div
      className="score-ring"
      data-passed={passed === null ? 'neutral' : passed ? 'pass' : 'fail'}
      role="img"
      aria-labelledby={titleId}
    >
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <title id={titleId}>
          {label} — {correct} correct, {incorrect} wrong, {missed} unanswered of {total}
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
      <div className="score-ring__text">
        <strong>{percentage}%</strong>
        <span>Score</span>
      </div>
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
