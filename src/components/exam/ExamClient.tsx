'use client';

import { AlertTriangle, ArrowLeft, Flag, Keyboard, LogOut, Menu, RotateCcw, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { ExamCard } from '@/components/exam/ExamCard';
import { QuestionNav } from '@/components/exam/QuestionNav';
import { Timer } from '@/components/exam/Timer';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ToastViewport, type ToastMessage, type ToastType } from '@/components/ui/Toast';
import { useExam, ExamProvider } from '@/hooks/useExam';
import { useProgress } from '@/hooks/useProgress';
import { useTimer } from '@/hooks/useTimer';
import { getExamMode } from '@/lib/modes';
import { getQuestionById, getSessionQuestions } from '@/lib/questions';
import { toHistoryEntry } from '@/lib/scoring';
import {
  completeSession,
  createExamSession,
  getCurrentQuestion,
  getUnansweredQuestionNumbers,
} from '@/lib/session';
import {
  clearCurrentSession,
  clearSessionForMode,
  KEYBOARD_HINT_KEY,
  readBooleanFlag,
  readAdvanceDuration,
  readSessionForMode,
  readSettings,
  saveBooleanFlag,
  saveCompletedSession,
  saveSessionForMode,
  saveHistory,
} from '@/lib/storage';
import { drivingTips } from '@/lib/tips';
import type { AnswerOption, ExamSession, Question } from '@/types/exam';

type LoadState = 'loading' | 'ready' | 'empty';

export function ExamClient({ questions }: { questions: Question[] }) {
  const searchParams = useSearchParams();
  const mode = getExamMode(searchParams.get('mode'));
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [session, setSession] = useState<ExamSession | null>(null);

  useEffect(() => {
    const restored = readSessionForMode(mode.id);
    if (restored) {
      setSession(restored);
      setLoadState('ready');
      return;
    }

    const retakeIds =
      mode.id === 'retake'
        ? (sessionStorage.getItem('ns-retake-questions') ?? '')
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)
        : [];
    const selectedQuestions =
      mode.id === 'retake' && retakeIds.length
        ? retakeIds.flatMap((id) => {
            const question = getQuestionById(id);
            return question ? [question] : [];
          })
        : getSessionQuestions(mode.filter, mode.questionCount);
    const created = createExamSession({
      questions: selectedQuestions,
      settings: readSettings(),
      mode: mode.id,
      questionIds: selectedQuestions.map((question) => question.id),
      autoAdvanceDurationMs: readAdvanceDuration() * 1000,
    });
    saveSessionForMode(created);
    setSession(created);
    setLoadState('ready');
  }, [mode.id, mode.filter, mode.questionCount]);

  if (loadState === 'loading') {
    return <LoadingTip />;
  }

  if (!session || loadState === 'empty') {
    return (
      <section className="empty-exam">
        <Badge tone="warning">No active session</Badge>
        <h1>Start a fresh practice exam.</h1>
        <p>Settings are saved locally, and the exam will be stored in this tab until submitted.</p>
        <ButtonLink
          href={`/exam?mode=${mode.id}`}
          icon={<RotateCcw aria-hidden="true" suppressHydrationWarning />}
        >
          Start exam
        </ButtonLink>
      </section>
    );
  }

  return (
    <ExamProvider initialSession={session} key={session.id}>
      <ExamWorkspace questions={questions} />
    </ExamProvider>
  );
}

function ExamWorkspace({ questions }: { questions: Question[] }) {
  const router = useRouter();
  const { state, dispatch } = useExam();
  const session = state.session;
  const questionsById = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions],
  );
  const currentQuestion = getCurrentQuestion(session, questionsById);
  const progress = useProgress(session);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [sectionBreakSeen, setSectionBreakSeen] = useState(false);
  const [keyboardHintVisible, setKeyboardHintVisible] = useState(false);
  const [autoAdvanceActive, setAutoAdvanceActive] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const pointerStartX = useRef<number | null>(null);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const questionNumber = session.currentIndex + 1;
  const tip = drivingTips[session.currentIndex % drivingTips.length] ?? drivingTips[0];
  const flaggedCount = session.flaggedIds.length;
  const showSectionBreak =
    session.mode === 'full-test' &&
    session.currentIndex === 20 &&
    session.questionIds[19] !== undefined &&
    session.answers[session.questionIds[19]] !== undefined &&
    !sectionBreakSeen;

  const dismissToast = useCallback((id: string): void => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info'): void => {
    setToasts((current) => [
      ...current,
      { id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`, message, type },
    ]);
  }, []);

  const cancelAutoAdvance = useCallback((): void => {
    if (autoAdvanceTimerRef.current !== null) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    setAutoAdvanceActive(false);
    dispatch({ type: 'cancel-auto-advance' });
  }, [dispatch]);

  const submitExam = useCallback(
    (expired = false): void => {
      const completed = completeSession(session);
      const historyEntry = toHistoryEntry(completed, questionsById);

      saveCompletedSession(completed);
      saveHistory(historyEntry);
      clearCurrentSession();
      dispatch({ type: 'submit', now: completed.completedAt ?? Date.now() });
      router.push(`/results${expired ? '?expired=1' : ''}`);
    },
    [dispatch, questionsById, router, session],
  );
  const handleTimerExpire = useCallback(() => {
    addToast("Time's up - your exam has been submitted", 'warning');
    submitExam(true);
  }, [addToast, submitExam]);
  const remaining = useTimer(session.expiresAt, handleTimerExpire);

  const handleFlag = useCallback((): void => {
    const flagged = session.flaggedIds.includes(currentQuestion.id);
    dispatch({ type: 'toggle-flag', questionId: currentQuestion.id });
    addToast(flagged ? 'Flag removed' : 'Answer flagged', flagged ? 'info' : 'warning');
  }, [addToast, currentQuestion.id, dispatch, session.flaggedIds]);

  useEffect(() => {
    setKeyboardHintVisible(!readBooleanFlag(KEYBOARD_HINT_KEY));
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [session.currentIndex]);

  useEffect(() => {
    if (autoAdvanceTimerRef.current !== null) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    if (
      !session.shouldAutoAdvance ||
      !session.autoAdvance ||
      session.currentIndex >= session.questionIds.length - 1
    ) {
      setAutoAdvanceActive(false);
      return undefined;
    }

    setAutoAdvanceActive(true);
    const timer = window.setTimeout(() => {
      setAutoAdvanceActive(false);
      autoAdvanceTimerRef.current = null;
      dispatch({ type: 'next' });
      dispatch({ type: 'cancel-auto-advance' });
    }, session.autoAdvanceDurationMs);

    autoAdvanceTimerRef.current = timer;

    return () => window.clearTimeout(timer);
  }, [
    dispatch,
    session.currentIndex,
    session.autoAdvance,
    session.autoAdvanceDurationMs,
    session.questionIds.length,
    session.shouldAutoAdvance,
  ]);

  useEffect(() => {
    function syncAdvanceDuration(): void {
      dispatch({
        type: 'set-auto-advance-duration',
        valueMs: readAdvanceDuration() * 1000,
      });
    }

    window.addEventListener('storage', syncAdvanceDuration);
    window.addEventListener('ns-learner-advance-duration-change', syncAdvanceDuration);

    return () => {
      window.removeEventListener('storage', syncAdvanceDuration);
      window.removeEventListener('ns-learner-advance-duration-change', syncAdvanceDuration);
    };
  }, [dispatch]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const target = event.target;

      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        return;
      }

      if (/^[1-4]$/.test(event.key)) {
        const optionIndex = Number(event.key) - 1;
        const optionId = session.optionOrder[currentQuestion.id]?.[optionIndex];

        if (optionId) {
          event.preventDefault();
          dispatch({ type: 'answer', questionId: currentQuestion.id, optionId });
        }
        return;
      }

      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        cancelAutoAdvance();
        handleFlag();
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'n' || event.key === 'N') {
        event.preventDefault();
        cancelAutoAdvance();
        dispatch({ type: 'next' });
        return;
      }

      if (event.key === 'ArrowLeft' || event.key === 'p' || event.key === 'P') {
        event.preventDefault();
        cancelAutoAdvance();
        dispatch({ type: 'previous' });
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setNavigatorOpen(false);
        setSubmitModalOpen(false);
        setExitModalOpen(false);
        setShortcutsOpen(false);
        return;
      }

      if (event.key === '?') {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        cancelAutoAdvance();
        if (session.currentIndex >= session.questionIds.length - 1) {
          requestSubmit();
        } else {
          dispatch({ type: 'next' });
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelAutoAdvance, currentQuestion.id, dispatch, handleFlag, session]);

  function answer(optionId: AnswerOption['id']): void {
    dispatch({ type: 'answer', questionId: currentQuestion.id, optionId });
  }

  function requestSubmit(): void {
    const unanswered = getUnansweredQuestionNumbers(session);

    if (unanswered.length) {
      setSubmitModalOpen(true);
      return;
    }

    submitExam();
  }

  function confirmSubmit(): void {
    setSubmitModalOpen(false);
    submitExam();
  }

  function exitExam(): void {
    clearSessionForMode(session.mode);
    router.push('/');
  }

  function dismissKeyboardHint(): void {
    saveBooleanFlag(KEYBOARD_HINT_KEY, true);
    setKeyboardHintVisible(false);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>): void {
    pointerStartX.current = event.clientX;
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLElement>): void {
    if (pointerStartX.current === null) {
      return;
    }

    const delta = event.clientX - pointerStartX.current;
    pointerStartX.current = null;

    if (Math.abs(delta) < 70) {
      return;
    }

    cancelAutoAdvance();
    dispatch({ type: delta < 0 ? 'next' : 'previous' });
  }

  return (
    <section
      className="exam-layout"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <header className="active-exam-header">
        <Button
          tone="ghost"
          size="sm"
          icon={<LogOut aria-hidden="true" suppressHydrationWarning />}
          onClick={() => setExitModalOpen(true)}
        >
          Exit
        </Button>
        <strong>
          {getExamMode(session.mode).label} · Question {questionNumber} of{' '}
          {session.questionIds.length}
        </strong>
        <Timer remaining={remaining} />
        <Badge tone={flaggedCount ? 'warning' : 'neutral'}>
          <Flag aria-hidden="true" suppressHydrationWarning />
          {flaggedCount} flagged
        </Badge>
        <Button
          tone="ghost"
          size="sm"
          icon={<Menu aria-hidden="true" suppressHydrationWarning />}
          onClick={() => setNavigatorOpen(true)}
        >
          Navigator
        </Button>
      </header>

      <aside className={navigatorOpen ? 'exam-sidebar is-open' : 'exam-sidebar'}>
        <div className="exam-sidebar__top">
          <Badge tone={session.instantFeedback ? 'warning' : 'brand'}>
            {session.instantFeedback ? 'Instant feedback' : 'End-of-exam mode'}
          </Badge>
          <Timer remaining={remaining} />
          <Button
            aria-label="Close navigator"
            className="exam-sidebar__close"
            tone="ghost"
            size="icon"
            icon={<X aria-hidden="true" suppressHydrationWarning />}
            onClick={() => setNavigatorOpen(false)}
          />
        </div>

        <div className="progress-card">
          <div className="progress-card__label">
            <span>
              {questionNumber} of {session.questionIds.length} questions
            </span>
            <strong>
              {progress.answered}/{progress.total}
            </strong>
          </div>
          <ProgressBar value={progress.percentage} label="Exam progress" />
          {session.mode === 'assisted' ? <small>Did you know? {tip}</small> : null}
        </div>

        <QuestionNav
          onSelect={(index) => {
            cancelAutoAdvance();
            setNavigatorOpen(false);
            dispatch({ type: 'go-to', index });
          }}
          questionsById={questionsById}
          session={session}
        />

        <ButtonLink
          href="/"
          tone="ghost"
          icon={<ArrowLeft aria-hidden="true" suppressHydrationWarning />}
        >
          Home
        </ButtonLink>
      </aside>

      <div className="exam-main">
        {showSectionBreak ? (
          <section className="section-break" role="status">
            <Badge tone="success">Section 1 complete</Badge>
            <h1>Section 1 complete</h1>
            <p>You answered 20 questions.</p>
            <p>Take a moment before starting Section 2.</p>
            <Button onClick={() => setSectionBreakSeen(true)}>Continue to Section 2 →</Button>
          </section>
        ) : (
          <ExamCard
            autoAdvanceActive={autoAdvanceActive}
            autoAdvanceDurationMs={session.autoAdvanceDurationMs}
            instantFeedback={session.instantFeedback}
            autoAdvance={session.autoAdvance}
            onAnswer={answer}
            onFlag={() => {
              cancelAutoAdvance();
              handleFlag();
            }}
            onNext={() => {
              cancelAutoAdvance();
              dispatch({ type: 'next' });
            }}
            onPrevious={() => {
              cancelAutoAdvance();
              dispatch({ type: 'previous' });
            }}
            onSubmit={requestSubmit}
            onToggleAutoAdvance={(value) => {
              cancelAutoAdvance();
              dispatch({ type: 'set-auto-advance', value });
            }}
            onToggleInstantFeedback={(value) => {
              cancelAutoAdvance();
              dispatch({ type: 'set-instant-feedback', value });
            }}
            question={currentQuestion}
            questionIndex={session.currentIndex}
            session={session}
            totalQuestions={session.questionIds.length}
          />
        )}
      </div>

      <button
        className="mobile-navigator-button"
        onClick={() => setNavigatorOpen(true)}
        type="button"
      >
        Q {questionNumber}/{session.questionIds.length}
      </button>

      {keyboardHintVisible ? (
        <div className="keyboard-hint" role="status">
          <Keyboard aria-hidden="true" suppressHydrationWarning />
          <span>Keyboard shortcuts available - press ? to see them.</span>
          <button onClick={dismissKeyboardHint} type="button">
            Got it
          </button>
        </div>
      ) : null}

      {submitModalOpen ? (
        <Modal title="Submit practice exam?" onClose={() => setSubmitModalOpen(false)}>
          <div className="submit-warning">
            <AlertTriangle aria-hidden="true" suppressHydrationWarning />
            <p>
              You have {getUnansweredQuestionNumbers(session).length} unanswered questions. Submit
              anyway?
            </p>
          </div>
          <div className="unanswered-list" aria-label="Unanswered questions">
            {getUnansweredQuestionNumbers(session).map((number) => (
              <span key={number}>Question {number}</span>
            ))}
          </div>
          <footer className="modal__footer">
            <Button tone="secondary" onClick={() => setSubmitModalOpen(false)}>
              Keep working
            </Button>
            <Button onClick={confirmSubmit}>Submit anyway</Button>
          </footer>
        </Modal>
      ) : null}

      {exitModalOpen ? (
        <Modal title="Exit exam?" onClose={() => setExitModalOpen(false)}>
          <div className="submit-warning">
            <AlertTriangle aria-hidden="true" suppressHydrationWarning />
            <p>Your progress will be lost.</p>
          </div>
          <footer className="modal__footer">
            <Button tone="secondary" onClick={() => setExitModalOpen(false)}>
              Cancel
            </Button>
            <Button tone="danger" onClick={exitExam}>
              Exit
            </Button>
          </footer>
        </Modal>
      ) : null}

      {shortcutsOpen ? (
        <Modal title="Keyboard shortcuts" onClose={() => setShortcutsOpen(false)}>
          <dl className="shortcut-list settings-grid">
            <div>
              <dt>1-4</dt>
              <dd>Choose an answer</dd>
            </div>
            <div>
              <dt>← / →</dt>
              <dd>Previous or next question</dd>
            </div>
            <div>
              <dt>N / P</dt>
              <dd>Next or previous question</dd>
            </div>
            <div>
              <dt>F</dt>
              <dd>Flag the current question</dd>
            </div>
            <div>
              <dt>Esc</dt>
              <dd>Close panels and dialogs</dd>
            </div>
          </dl>
        </Modal>
      ) : null}

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </section>
  );
}

function LoadingTip() {
  return (
    <section className="loading-state" role="status">
      <Badge tone="brand">Loading</Badge>
      <h1>Preparing your practice exam.</h1>
      <p>Did you know? Learners in Nova Scotia must maintain zero blood alcohol level.</p>
    </section>
  );
}
