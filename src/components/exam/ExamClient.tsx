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
  clearSessionFlag,
  KEYBOARD_HINT_KEY,
  SECTION_BREAK_SEEN_KEY,
  readBooleanFlag,
  readAdvanceDuration,
  readSessionBooleanFlag,
  readSessionForMode,
  readSettings,
  RETAKE_QUESTIONS_KEY,
  saveBooleanFlag,
  saveCompletedSession,
  saveSessionForMode,
  saveSessionBooleanFlag,
  saveHistory,
  sessionGet,
} from '@/lib/storage';
import { drivingTips } from '@/lib/tips';
import { nextToastId } from '@/lib/toast';
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
    try {
      const retakeIds =
        mode.id === 'retake'
          ? sessionGet<string>(RETAKE_QUESTIONS_KEY, '')
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
        mode.id === 'retake'
          ? retakeQuestions
          : getSessionQuestions(mode.filter, mode.questionCount);
      const created = createExamSession({
        questions: selectedQuestions,
        settings: readSettings(),
        mode: mode.id,
        questionIds: selectedQuestions.map((question) => question.id),
        autoAdvanceDurationMs: readAdvanceDuration() * 1000,
      });
      clearSessionFlag(SECTION_BREAK_SEEN_KEY);
      saveSessionForMode(created);
      setSession(created);
      setLoadState('ready');
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[ExamClient] Session initialization error:', err);
      }
      setSession(null);
      setLoadState('empty');
    }
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
  const [explanationModalOpen, setExplanationModalOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [sectionBreakSeen, setSectionBreakSeen] = useState(() =>
    readSessionBooleanFlag(SECTION_BREAK_SEEN_KEY),
  );
  const [keyboardHintVisible, setKeyboardHintVisible] = useState(false);
  const [autoAdvanceActive, setAutoAdvanceActive] = useState(false);
  const [timerAnnouncement, setTimerAnnouncement] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const pointerStartX = useRef<number | null>(null);
  const pointerStartY = useRef<number | null>(null);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const announcedTimerMilestonesRef = useRef(new Set<number>());
  const sessionRef = useRef(session);
  const currentQuestionRef = useRef(currentQuestion);
  const overlayOpenRef = useRef({
    submitModalOpen,
    exitModalOpen,
    explanationModalOpen,
    shortcutsOpen,
    navigatorOpen,
  });
  const dispatchRef = useRef(dispatch);
  const cancelAutoAdvanceRef = useRef<() => void>(() => undefined);
  const handleFlagRef = useRef<() => void>(() => undefined);
  const requestSubmitRef = useRef<() => void>(() => undefined);
  const questionNumber = session.currentIndex + 1;
  const tip = drivingTips[session.currentIndex % drivingTips.length]!;
  const flaggedCount = session.flaggedIds.length;
  const modeLabel = getExamMode(session.mode).label;
  const isLastQuestion = session.currentIndex === session.questionIds.length - 1;
  const currentQuestionFlagged = session.flaggedIds.includes(currentQuestion.id);
  const currentQuestionAnswered = session.answers[currentQuestion.id] !== undefined;
  const explanationAvailable = Boolean(
    currentQuestion.explanation && currentQuestionAnswered && session.phase === 'review',
  );
  const showSectionBreak =
    session.mode === 'full-test' &&
    session.currentIndex === 20 &&
    session.questionIds[19] !== undefined &&
    session.answers[session.questionIds[19]] !== undefined &&
    !sectionBreakSeen;
  sessionRef.current = session;
  currentQuestionRef.current = currentQuestion;
  overlayOpenRef.current = {
    submitModalOpen,
    exitModalOpen,
    explanationModalOpen,
    shortcutsOpen,
    navigatorOpen,
  };
  dispatchRef.current = dispatch;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- memo reads session via spread; key deps are questionIds and answers
  }, [questionsById, showSectionBreak, session.questionIds, session.answers]);

  const dismissToast = useCallback((id: string): void => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info'): void => {
    setToasts((current) => [
      ...current,
      {
        id: nextToastId(),
        message,
        type,
      },
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
      if (sessionRef.current.phase === 'complete') return;

      const completed = completeSession(session);
      const historyEntry = toHistoryEntry(completed, questionsById);

      saveCompletedSession(completed);
      saveHistory(historyEntry);
      clearCurrentSession();
      clearSessionFlag(SECTION_BREAK_SEEN_KEY);
      dispatch({ type: 'submit', now: completed.completedAt ?? Date.now() });
      router.push(`/results${expired ? '?expired=1' : ''}`);
    },
    [dispatch, questionsById, router, session],
  );
  const handleTimerExpire = useCallback(() => {
    setTimerAnnouncement("Time's up");
    addToast("Time's up - your exam has been submitted", 'warning');
    submitExam(true);
  }, [addToast, submitExam]);
  const remaining = useTimer(session.expiresAt, handleTimerExpire);

  const handleFlag = useCallback((): void => {
    const flagged = session.flaggedIds.includes(currentQuestion.id);
    dispatch({ type: 'toggle-flag', questionId: currentQuestion.id });
    addToast(flagged ? 'Flag removed' : 'Answer flagged', flagged ? 'info' : 'warning');
  }, [addToast, currentQuestion.id, dispatch, session.flaggedIds]);

  const requestSubmit = useCallback((): void => {
    const unanswered = getUnansweredQuestionNumbers(session);

    if (unanswered.length) {
      setSubmitModalOpen(true);
      return;
    }

    submitExam();
  }, [session, submitExam]);

  const answer = useCallback(
    (optionId: AnswerOption['id']): void => {
      dispatch({ type: 'answer', questionId: currentQuestion.id, optionId });
    },
    [currentQuestion.id, dispatch],
  );

  const handleNext = useCallback((): void => {
    cancelAutoAdvance();
    dispatch({ type: 'next' });
  }, [cancelAutoAdvance, dispatch]);

  const handleOpenExplanation = useCallback((): void => {
    cancelAutoAdvance();
    setExplanationModalOpen(true);
  }, [cancelAutoAdvance]);

  const handleToggleAutoAdvance = useCallback(
    (value: boolean): void => {
      cancelAutoAdvance();
      dispatch({ type: 'set-auto-advance', value });
    },
    [cancelAutoAdvance, dispatch],
  );

  const handleToggleInstantFeedback = useCallback(
    (value: boolean): void => {
      cancelAutoAdvance();
      dispatch({ type: 'set-instant-feedback', value });
    },
    [cancelAutoAdvance, dispatch],
  );

  const handleActionFlag = useCallback((): void => {
    cancelAutoAdvance();
    handleFlag();
  }, [cancelAutoAdvance, handleFlag]);

  const handleOpenExitModal = useCallback((): void => {
    setExitModalOpen(true);
  }, []);

  const handleOpenNavigator = useCallback((): void => {
    setNavigatorOpen(true);
  }, []);

  const handleCloseNavigator = useCallback((): void => {
    setNavigatorOpen(false);
  }, []);

  const handleNavigatorSelect = useCallback(
    (index: number): void => {
      cancelAutoAdvance();
      dispatch({ type: 'go-to', index });
    },
    [cancelAutoAdvance, dispatch],
  );
  cancelAutoAdvanceRef.current = cancelAutoAdvance;
  handleFlagRef.current = handleFlag;
  requestSubmitRef.current = requestSubmit;

  useEffect(() => {
    setKeyboardHintVisible(!readBooleanFlag(KEYBOARD_HINT_KEY));
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('exam-route-active');
    document.body.classList.add('exam-route-active');

    return () => {
      document.documentElement.classList.remove('exam-route-active');
      document.body.classList.remove('exam-route-active');
    };
  }, []);

  useEffect(() => {
    announcedTimerMilestonesRef.current.clear();
    setTimerAnnouncement('');
  }, [session.id, session.expiresAt]);

  useEffect(() => {
    setExplanationModalOpen(false);
  }, [currentQuestion.id]);

  useEffect(() => {
    if (remaining === null || remaining <= 0) {
      return;
    }

    const milestone = remaining <= 30 ? 30 : remaining <= 60 ? 60 : remaining <= 300 ? 300 : null;

    if (milestone === null || announcedTimerMilestonesRef.current.has(milestone)) {
      return;
    }

    announcedTimerMilestonesRef.current.add(milestone);
    setTimerAnnouncement(
      milestone === 300
        ? '5 minutes remaining'
        : milestone === 60
          ? '1 minute remaining'
          : '30 seconds remaining',
    );
  }, [remaining]);

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
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const overlays = overlayOpenRef.current;
      if (
        overlays.submitModalOpen ||
        overlays.exitModalOpen ||
        overlays.explanationModalOpen ||
        overlays.shortcutsOpen ||
        overlays.navigatorOpen
      ) {
        return;
      }

      const target = event.target;

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      const activeSession = sessionRef.current;
      const activeQuestion = currentQuestionRef.current;

      if (/^[1-4]$/.test(event.key)) {
        const optionIndex = Number(event.key) - 1;
        const optionId = activeSession.optionOrder[activeQuestion.id]?.[optionIndex];

        if (optionId) {
          event.preventDefault();
          dispatchRef.current({ type: 'answer', questionId: activeQuestion.id, optionId });
        }
        return;
      }

      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        cancelAutoAdvanceRef.current();
        handleFlagRef.current();
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'n' || event.key === 'N') {
        event.preventDefault();
        cancelAutoAdvanceRef.current();
        if (activeSession.currentIndex >= activeSession.questionIds.length - 1) {
          requestSubmitRef.current();
        } else {
          dispatchRef.current({ type: 'next' });
        }
        return;
      }

      if (event.key === 'ArrowLeft' || event.key === 'p' || event.key === 'P') {
        event.preventDefault();
        cancelAutoAdvanceRef.current();
        dispatchRef.current({ type: 'previous' });
        return;
      }

      if (event.key === 'Escape') {
        return;
      }

      if (event.key === '?') {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        cancelAutoAdvanceRef.current();
        if (activeSession.currentIndex >= activeSession.questionIds.length - 1) {
          requestSubmitRef.current();
        } else {
          dispatchRef.current({ type: 'next' });
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function confirmSubmit(): void {
    setSubmitModalOpen(false);
    submitExam();
  }

  function exitExam(): void {
    clearSessionForMode(session.mode);
    clearSessionFlag(SECTION_BREAK_SEEN_KEY);
    router.push('/');
  }

  function continueToSectionTwo(): void {
    saveSessionBooleanFlag(SECTION_BREAK_SEEN_KEY, true);
    setSectionBreakSeen(true);
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

  function handlePointerCancel(): void {
    pointerStartX.current = null;
    pointerStartY.current = null;
  }

  const unansweredNumbers = useMemo(
    () => (submitModalOpen ? getUnansweredQuestionNumbers(session) : []),
    [submitModalOpen, session],
  );

  return (
    <section
      className="exam-layout"
      data-testid="exam-shell"
      onPointerDown={handlePointerDown}
      onPointerCancel={handlePointerCancel}
      onPointerUp={handlePointerUp}
    >
      <ExamTopBar
        flaggedCount={flaggedCount}
        modeLabel={modeLabel}
        onExit={handleOpenExitModal}
        onOpenNavigator={handleOpenNavigator}
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
            <Button onClick={continueToSectionTwo}>Continue to Section 2 →</Button>
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
        explanationAvailable={explanationAvailable}
        flagged={currentQuestionFlagged}
        instantFeedback={session.instantFeedback}
        isLast={isLastQuestion}
        onOpenExplanation={handleOpenExplanation}
        onFlag={handleActionFlag}
        onNext={handleNext}
        onSubmit={requestSubmit}
        onToggleAutoAdvance={handleToggleAutoAdvance}
        onToggleInstantFeedback={handleToggleInstantFeedback}
      />

      <NavigatorDrawer
        modeLabel={modeLabel}
        onClose={handleCloseNavigator}
        onRequestExit={handleOpenExitModal}
        onSelect={handleNavigatorSelect}
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

      <div className="sr-only" aria-live="polite">
        {timerAnnouncement}
      </div>

      {submitModalOpen ? (
        <Modal title="Submit practice exam?" onClose={() => setSubmitModalOpen(false)}>
          <div className="submit-warning">
            <AlertTriangle aria-hidden="true" />
            <p>You have {unansweredNumbers.length} unanswered questions. Submit anyway?</p>
          </div>
          <div className="unanswered-list" aria-label="Unanswered questions">
            {unansweredNumbers.map((number) => (
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

      {explanationModalOpen && explanationAvailable ? (
        <Modal title="Explanation" onClose={() => setExplanationModalOpen(false)}>
          <div className="explanation-modal__body">
            <p>{currentQuestion.explanation}</p>
            {currentQuestion.handbookSection ? (
              <small>{currentQuestion.handbookSection}</small>
            ) : null}
          </div>
          <footer className="modal__footer">
            <Button onClick={() => setExplanationModalOpen(false)}>Close</Button>
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
