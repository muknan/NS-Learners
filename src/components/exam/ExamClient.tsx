'use client';

import { AlertTriangle, Keyboard, RotateCcw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { ExamActionBar } from '@/components/exam/ExamActionBar';
import { ExamCard } from '@/components/exam/ExamCard';
import { ExamTopBar } from '@/components/exam/ExamTopBar';
import { NavigatorDrawer } from '@/components/exam/NavigatorDrawer';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ToastViewport, type ToastMessage, type ToastType } from '@/components/ui/Toast';
import { useExam, ExamProvider } from '@/hooks/useExam';
import { useProgress } from '@/hooks/useProgress';
import { useTimer } from '@/hooks/useTimer';
import { getExamMode } from '@/lib/modes';
import { getQuestionById, getSessionQuestions } from '@/lib/questions';
import { getQuestionResults, toHistoryEntry } from '@/lib/scoring';
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
  RETAKE_QUESTIONS_KEY,
  saveBooleanFlag,
  saveCompletedSession,
  saveSessionForMode,
  saveHistory,
} from '@/lib/storage';
import { drivingTips } from '@/lib/tips';
import type { AnswerOption, ExamSession, Question } from '@/types/exam';

type LoadState = 'loading' | 'ready' | 'empty';
const SWIPE_INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, details, summary, [role="button"]';

export function ExamClient({ questions }: { questions: Question[] }) {
  const searchParams = useSearchParams();
  const mode = getExamMode(searchParams.get('mode'));
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [session, setSession] = useState<ExamSession | null>(null);

  useEffect(() => {
    const retakeIds =
      mode.id === 'retake'
        ? (sessionStorage.getItem(RETAKE_QUESTIONS_KEY) ?? '')
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)
        : [];
    const retakeQuestions = retakeIds.flatMap((id) => {
      const question = getQuestionById(id);
      return question ? [question] : [];
    });

    if (mode.id === 'retake' && retakeQuestions.length === 0) {
      setSession(null);
      setLoadState('empty');
      return;
    }

    const restored = readSessionForMode(mode.id);
    if (
      restored &&
      (mode.id !== 'retake' || sameQuestionIds(restored.questionIds, retakeQuestions))
    ) {
      setSession(restored);
      setLoadState('ready');
      return;
    }

    const selectedQuestions =
      mode.id === 'retake' ? retakeQuestions : getSessionQuestions(mode.filter, mode.questionCount);
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
        <Badge tone="warning">
          {mode.id === 'retake' ? 'No missed questions' : 'No active session'}
        </Badge>
        <h1>
          {mode.id === 'retake' ? 'No missed questions to retake.' : 'Start a fresh practice exam.'}
        </h1>
        <p>
          {mode.id === 'retake'
            ? 'There are no missed questions saved for a retake. Start a fresh full test when you are ready.'
            : 'Settings are saved locally, and the exam will be stored in this tab until submitted.'}
        </p>
        <ButtonLink
          href={mode.id === 'retake' ? '/exam?mode=full-test' : `/exam?mode=${mode.id}`}
          icon={<RotateCcw aria-hidden="true" />}
        >
          {mode.id === 'retake' ? 'Start fresh full test' : 'Start exam'}
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

function sameQuestionIds(questionIds: readonly string[], questions: readonly Question[]): boolean {
  if (questionIds.length !== questions.length) {
    return false;
  }

  const expectedIds = new Set(questions.map((question) => question.id));
  return questionIds.every((id) => expectedIds.has(id));
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
  const pointerStartY = useRef<number | null>(null);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const questionNumber = session.currentIndex + 1;
  const tip = drivingTips[session.currentIndex % drivingTips.length]!;
  const flaggedCount = session.flaggedIds.length;
  const modeLabel = getExamMode(session.mode).label;
  const isLastQuestion = session.currentIndex === session.questionIds.length - 1;
  const currentQuestionFlagged = session.flaggedIds.includes(currentQuestion.id);
  const showSectionBreak =
    session.mode === 'full-test' &&
    session.currentIndex === 20 &&
    session.questionIds[19] !== undefined &&
    session.answers[session.questionIds[19]] !== undefined &&
    !sectionBreakSeen;
  const sectionOneScore = useMemo(() => {
    if (!showSectionBreak) {
      return null;
    }

    const sectionQuestionIds = session.questionIds.slice(0, 20);
    const sectionResults = getQuestionResults(
      {
        ...session,
        questionIds: sectionQuestionIds,
        answers: Object.fromEntries(
          sectionQuestionIds.flatMap((questionId) => {
            const answer = session.answers[questionId];
            return answer ? [[questionId, answer]] : [];
          }),
        ),
      },
      questionsById,
    );
    const correct = sectionResults.filter((result) => result.isCorrect).length;

    return { correct, total: sectionResults.length };
  }, [questionsById, session, showSectionBreak]);

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
    window.scrollTo(0, 0);
  }, [session.currentIndex]);

  useEffect(() => {
    document.documentElement.classList.add('exam-route-active');
    document.body.classList.add('exam-route-active');

    return () => {
      document.documentElement.classList.remove('exam-route-active');
      document.body.classList.remove('exam-route-active');
    };
  }, []);

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
        if (session.currentIndex >= session.questionIds.length - 1) {
          requestSubmit();
        } else {
          dispatch({ type: 'next' });
        }
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
    if (event.pointerType !== 'touch') {
      pointerStartX.current = null;
      pointerStartY.current = null;
      return;
    }

    const target = event.target;
    if (!(target instanceof Element) || target.closest(SWIPE_INTERACTIVE_SELECTOR)) {
      pointerStartX.current = null;
      pointerStartY.current = null;
      return;
    }

    pointerStartX.current = event.clientX;
    pointerStartY.current = event.clientY;
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLElement>): void {
    if (
      event.pointerType !== 'touch' ||
      pointerStartX.current === null ||
      pointerStartY.current === null
    ) {
      pointerStartX.current = null;
      pointerStartY.current = null;
      return;
    }

    const horizontalDelta = event.clientX - pointerStartX.current;
    const verticalDelta = Math.abs(event.clientY - pointerStartY.current);
    pointerStartX.current = null;
    pointerStartY.current = null;

    if (Math.abs(horizontalDelta) < Math.max(70, 1.5 * verticalDelta)) {
      return;
    }

    cancelAutoAdvance();
    if (horizontalDelta < 0 && isLastQuestion) {
      requestSubmit();
      return;
    }

    dispatch({ type: horizontalDelta < 0 ? 'next' : 'previous' });
  }

  return (
    <section
      className="exam-layout"
      data-testid="exam-shell"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <ExamTopBar
        flaggedCount={flaggedCount}
        modeLabel={modeLabel}
        onExit={() => setExitModalOpen(true)}
        onOpenNavigator={() => setNavigatorOpen(true)}
        questionNumber={questionNumber}
        remaining={remaining}
        totalQuestions={session.questionIds.length}
      />

      <div className="exam-main">
        {showSectionBreak ? (
          <section className="section-break" role="status">
            <Badge tone="success">Section 1 complete</Badge>
            <h1>Section 1 complete</h1>
            <p>
              Section 1: {sectionOneScore?.correct ?? 0} / {sectionOneScore?.total ?? 20} correct
            </p>
            <p>Take a moment before starting Section 2.</p>
            <Button onClick={() => setSectionBreakSeen(true)}>Continue to Section 2 →</Button>
          </section>
        ) : (
          <ExamCard
            instantFeedback={session.instantFeedback}
            onAnswer={answer}
            question={currentQuestion}
            questionIndex={session.currentIndex}
            session={session}
            totalQuestions={session.questionIds.length}
          />
        )}
      </div>

      <ExamActionBar
        autoAdvance={session.autoAdvance}
        autoAdvanceActive={autoAdvanceActive}
        autoAdvanceDurationMs={session.autoAdvanceDurationMs}
        flagged={currentQuestionFlagged}
        instantFeedback={session.instantFeedback}
        isLast={isLastQuestion}
        onFlag={() => {
          cancelAutoAdvance();
          handleFlag();
        }}
        onNext={() => {
          cancelAutoAdvance();
          dispatch({ type: 'next' });
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
      />

      <NavigatorDrawer
        modeLabel={modeLabel}
        onClose={() => setNavigatorOpen(false)}
        onRequestExit={() => setExitModalOpen(true)}
        onSelect={(index) => {
          cancelAutoAdvance();
          dispatch({ type: 'go-to', index });
        }}
        open={navigatorOpen}
        progress={progress}
        questionsById={questionsById}
        session={session}
        tip={tip}
      />

      {keyboardHintVisible ? (
        <div className="keyboard-hint" role="region" aria-label="Keyboard shortcuts hint">
          <Keyboard aria-hidden="true" />
          <span>Keyboard shortcuts available - press ? to see them.</span>
          <button onClick={dismissKeyboardHint} type="button">
            Got it
          </button>
        </div>
      ) : null}

      {submitModalOpen ? (
        <Modal title="Submit practice exam?" onClose={() => setSubmitModalOpen(false)}>
          <div className="submit-warning">
            <AlertTriangle aria-hidden="true" />
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
            <AlertTriangle aria-hidden="true" />
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
              <dt>Enter / Space</dt>
              <dd>Continue or submit</dd>
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
