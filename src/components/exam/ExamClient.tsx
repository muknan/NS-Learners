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
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { ToastViewport, type ToastMessage, type ToastType } from '@/components/ui/Toast';
import { useExam, ExamProvider } from '@/hooks/useExam';
import { useNavigationBlocker } from '@/hooks/useNavigationBlocker';
import { useProgress } from '@/hooks/useProgress';
import { useTimer } from '@/hooks/useTimer';
import { getExamMode } from '@/lib/modes';
import { getQuestionById } from '@/lib/questions';
import { getQuestionResults, toHistoryEntry } from '@/lib/scoring';
import {
  completeSession,
  createExamSession,
  getCurrentQuestion,
  getUnansweredQuestionNumbers,
} from '@/lib/session';
import {
  clearSessionForMode,
  clearLocalFlag,
  KEYBOARD_HINT_KEY,
  ADVANCE_DURATION_KEY,
  localGet,
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
import { nextToastId } from '@/lib/toast';
import type { AnswerOption, ExamSession, Question } from '@/types/exam';

type LoadState = 'loading' | 'ready' | 'empty' | 'locked' | 'unsupported';
const SWIPE_INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, details, summary, [role="button"]';

export function ExamClient({ questions }: { questions: Question[] }) {
  const searchParams = useSearchParams();
  const mode = getExamMode(searchParams.get('mode'));
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [session, setSession] = useState<ExamSession | null>(null);

  useEffect(() => {
    let disposed = false;
    let release: (() => void) | undefined;
    setLoadState('loading');
    function initialize(): void {
      try {
        const restored = readSessionForMode(mode.id);
        if (restored) {
          setSession(restored);
          setLoadState('ready');
          return;
        }
        const retakeIds =
          mode.id === 'retake'
            ? localGet<string>(RETAKE_QUESTIONS_KEY, '')
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

        const created = createExamSession({
          questions,
          settings: readSettings(),
          mode: mode.id,
          ...(mode.id === 'retake' ? { questionIds: retakeIds, source: 'missed' as const } : {}),
          autoAdvanceDurationMs: readAdvanceDuration() * 1000,
        });
        saveSessionForMode(created);
        if (mode.id === 'retake') {
          clearLocalFlag(RETAKE_QUESTIONS_KEY);
        }
        setSession(created);
        setLoadState('ready');
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[ExamClient] Session initialization error:', err);
        }
        setSession(null);
        setLoadState('empty');
      }
    }

    if (!navigator.locks) {
      setLoadState('unsupported');
      return;
    }
    void navigator.locks
      .request(`ns-exam-mode-${mode.id}`, { ifAvailable: true }, async (lock) => {
        if (disposed) return;
        if (!lock) {
          setLoadState('locked');
          return;
        }
        await new Promise<void>((resolve) => {
          release = resolve;
          initialize();
        });
      })
      .catch(() => {
        if (!disposed) setLoadState('unsupported');
      });
    return () => {
      disposed = true;
      release?.();
    };
  }, [mode.id, questions]);

  if (loadState === 'loading') {
    return <LoadingTip />;
  }

  if (loadState === 'locked' || loadState === 'unsupported') {
    return (
      <section className="empty-exam">
        <h1>
          {loadState === 'locked'
            ? 'This mode is already open in another tab.'
            : 'This browser cannot safely coordinate saved exams.'}
        </h1>
        <p>
          {loadState === 'locked'
            ? 'Continue there, or close that tab and retry here.'
            : 'Use a current browser over HTTPS to start an exam.'}
        </p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
        <ButtonLink href="/">Go home</ButtonLink>
      </section>
    );
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
        <div className="stats-row">
          {mode.id === 'retake' ? (
            <>
              <ButtonLink href="/exam?mode=full-test" icon={<RotateCcw aria-hidden="true" />}>
                Start fresh full test
              </ButtonLink>
              <ButtonLink href="/results" tone="ghost">
                View results
              </ButtonLink>
            </>
          ) : (
            <ButtonLink href={`/exam?mode=${mode.id}`} icon={<RotateCcw aria-hidden="true" />}>
              Start exam
            </ButtonLink>
          )}
        </div>
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
  const { state, dispatch, saveFailed } = useExam();
  const session = state.session;
  const questionsById = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions],
  );
  const currentQuestion = getCurrentQuestion(session, questionsById);
  const progress = useProgress(session);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [exitError, setExitError] = useState('');
  const [explanationModalOpen, setExplanationModalOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const sectionBreakSeen = session.sectionBreakSeen === true;
  const submittingRef = useRef(false);
  const [keyboardHintVisible, setKeyboardHintVisible] = useState(false);
  const [autoAdvanceActive, setAutoAdvanceActive] = useState(false);
  const [timerAnnouncement, setTimerAnnouncement] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const pointerStartX = useRef<number | null>(null);
  const pointerStartY = useRef<number | null>(null);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const announcedTimerMilestonesRef = useRef(new Set<number>());
  const sessionRef = useRef(session);
  const remainingRef = useRef<number | null>(null);
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
  const keyboardHintVisibleRef = useRef(false);
  const dismissKeyboardHintRef = useRef<() => void>(() => undefined);
  const continueToSectionTwoRef = useRef(continueToSectionTwo);
  const showSectionBreakRef = useRef(false);
  const questionNumber = session.currentIndex + 1;
  const modeLabel = getExamMode(session.mode).label;
  const isLastQuestion = session.currentIndex === session.questionIds.length - 1;
  const currentQuestionFlagged = session.flaggedIds.includes(currentQuestion.id);
  const currentQuestionAnswered = session.answers[currentQuestion.id] !== undefined;
  const explanationAvailable = Boolean(
    currentQuestion.explanation && currentQuestionAnswered && session.phase === 'review',
  );
  const showSectionBreak =
    session.mode === 'full-test' && session.currentIndex === 20 && !sectionBreakSeen;
  const tip = useMemo(
    () => drivingTips[Math.floor(Math.random() * drivingTips.length)]!,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable for session lifetime
    [session.id],
  );
  const flaggedCount = session.flaggedIds.length;
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
  continueToSectionTwoRef.current = continueToSectionTwo;
  showSectionBreakRef.current = showSectionBreak;
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

  const continueBlockedNavigation = useNavigationBlocker({
    enabled: session.phase === 'in-progress' || session.phase === 'review',
    stateKey: 'examNavigationGuard',
    onBlocked: () => setLeaveConfirmOpen(true),
  });

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
      if (sessionRef.current.phase === 'complete' || submittingRef.current) return;
      submittingRef.current = true;

      const completed = completeSession(sessionRef.current);
      const historyEntry = toHistoryEntry(completed, questionsById);

      cancelAutoAdvance();
      if (!saveCompletedSession(completed) || !saveHistory(historyEntry)) {
        submittingRef.current = false;
        addToast(
          'Could not save your result. Keep this tab open, free browser storage, then submit again.',
          'error',
        );
        return;
      }
      clearSessionForMode(session.mode);
      dispatch({ type: 'submit', now: completed.completedAt ?? Date.now() });
      router.push(`/results${expired ? '?expired=1' : ''}`);
    },
    [addToast, cancelAutoAdvance, dispatch, questionsById, router, session],
  );
  const handleTimerExpire = useCallback(() => {
    if (submittingRef.current) return;
    if (
      sessionRef.current.mode === 'full-test' &&
      sessionRef.current.sectionTwoStartedAt == null &&
      sessionRef.current.questionIds.length === 40
    ) {
      cancelAutoAdvance();
      dispatch({ type: 'go-to', index: 20 });
      addToast('Road rules time is up. The road signs section has started.', 'warning');
      return;
    }
    setTimerAnnouncement("Time's up");
    addToast("Time's up. Saving your result.", 'warning');
    submitExam(true);
  }, [addToast, cancelAutoAdvance, dispatch, submitExam]);
  const remaining = useTimer(session.expiresAt, handleTimerExpire);
  remainingRef.current = remaining;
  useEffect(() => {
    if (
      submitModalOpen ||
      exitModalOpen ||
      explanationModalOpen ||
      shortcutsOpen ||
      navigatorOpen ||
      leaveConfirmOpen
    )
      cancelAutoAdvance();
  }, [
    submitModalOpen,
    exitModalOpen,
    explanationModalOpen,
    shortcutsOpen,
    navigatorOpen,
    leaveConfirmOpen,
    cancelAutoAdvance,
  ]);

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
    cancelAutoAdvance();
    setNavigatorOpen(false);
    setExitError('');
    setExitModalOpen(true);
  }, [cancelAutoAdvance]);

  const handleOpenNavigator = useCallback((): void => {
    cancelAutoAdvance();
    setNavigatorOpen(true);
  }, [cancelAutoAdvance]);

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
  keyboardHintVisibleRef.current = keyboardHintVisible;
  dismissKeyboardHintRef.current = dismissKeyboardHint;

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
      if (
        !document.querySelector('[role="dialog"], dialog[open]') &&
        sessionRef.current.phase !== 'complete'
      )
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
    function syncAdvanceDuration(event: Event): void {
      if (event instanceof StorageEvent && event.key !== ADVANCE_DURATION_KEY) return;
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
      if (
        event.defaultPrevented ||
        document.querySelector('[role="dialog"], dialog[open]') ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }

      // When the section break screen is visible, only allow Continue and Escape.
      if (showSectionBreakRef.current) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          continueToSectionTwoRef.current();
        }
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
        target instanceof HTMLSelectElement ||
        ((event.key === 'Enter' || event.key === ' ') &&
          target instanceof HTMLElement &&
          Boolean(target.closest('button, a, summary'))) ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      const activeSession = sessionRef.current;
      const activeQuestion = currentQuestionRef.current;

      if (/^[1-4]$/.test(event.key)) {
        if (remainingRef.current !== null && remainingRef.current <= 0) return;
        const optionIndex = Number(event.key) - 1;
        const optionId = activeSession.optionOrder[activeQuestion.id]?.[optionIndex];
        const alreadyLocked =
          activeSession.instantFeedback &&
          activeSession.answers[activeQuestion.id] !== undefined &&
          activeSession.phase === 'review';

        if (optionId && !alreadyLocked) {
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
        if (keyboardHintVisibleRef.current) {
          event.preventDefault();
          dismissKeyboardHintRef.current();
        }
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

  function exitExam(saveProgress: boolean): void {
    if (submittingRef.current || sessionRef.current.phase === 'complete') return;
    submittingRef.current = true;
    setExitError('');
    try {
      const current = sessionRef.current;
      if (saveProgress) {
        if (!saveSessionForMode({ ...current, shouldAutoAdvance: false })) {
          throw new Error('Storage unavailable');
        }
      } else {
        clearSessionForMode(current.mode);
      }
      router.push(saveProgress ? '/?savedProgress=1' : '/');
    } catch {
      submittingRef.current = false;
      setExitError(
        'Could not ' +
          (saveProgress ? 'save your progress' : 'discard this attempt') +
          '. Keep this tab open and try again.',
      );
    }
  }

  function continueToSectionTwo(): void {
    dispatch({ type: 'dismiss-section-break' });
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
        {saveFailed ? (
          <p role="alert">
            Progress could not be saved. Keep this tab open and free browser storage before leaving.
          </p>
        ) : null}
        {showSectionBreak ? (
          <section className="section-break" role="status">
            <Badge tone="success">Section 1 complete</Badge>
            <h1>Section 1 complete</h1>
            <p>
              Section 1: {sectionOneScore?.correct ?? 0} / {sectionOneScore?.total ?? 20} correct
            </p>
            <p>
              Road signs has 30 minutes. Its timer is running. Road rules answers are now locked.
            </p>
            <Button onClick={continueToSectionTwo}>Continue to Section 2 →</Button>
          </section>
        ) : (
          <ExamCard
            locked={remaining !== null && remaining <= 0}
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
        onOpenSettings={cancelAutoAdvance}
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
            <p>
              Save this attempt to resume later, or discard it without adding a completed result.
              {session.expiresAt !== null
                ? ' The timed test clock keeps running while you are away.'
                : ''}
            </p>
          </div>
          {exitError ? <p role="alert">{exitError}</p> : null}
          <footer className="modal__footer">
            <Button tone="secondary" onClick={() => setExitModalOpen(false)}>
              Keep practicing
            </Button>
            <Button tone="ghost" onClick={() => exitExam(false)}>
              Exit without saving
            </Button>
            <Button onClick={() => exitExam(true)}>Save progress &amp; exit</Button>
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
          <dl className="shortcut-list shortcut-list--in-modal">
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

      <ConfirmDialog
        open={leaveConfirmOpen}
        title="Leave exam?"
        description="Your current session is saved in this browser. Leave this page?"
        confirmLabel="Leave"
        cancelLabel="Stay"
        onCancel={() => setLeaveConfirmOpen(false)}
        onConfirm={continueBlockedNavigation}
      />

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </section>
  );
}

function LoadingTip() {
  // Static export cannot know the URL's mode until hydration.
  const tip = drivingTips[0]!;
  return (
    <section className="loading-state" role="status">
      <Badge tone="brand">Loading</Badge>
      <h1>Preparing your practice exam.</h1>
      <p>Did you know? {tip}</p>
    </section>
  );
}
