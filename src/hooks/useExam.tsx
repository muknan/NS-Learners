'use client';

import type { AnswerOption, ExamSession } from '@/types/exam';
import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';
import { saveCurrentSession } from '@/lib/storage';

export type ExamAction =
  | { type: 'answer'; questionId: string; optionId: AnswerOption['id'] }
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'go-to'; index: number }
  | { type: 'toggle-flag'; questionId: string }
  | { type: 'set-instant-feedback'; value: boolean }
  | { type: 'set-auto-advance'; value: boolean }
  | { type: 'set-auto-advance-duration'; valueMs: number }
  | { type: 'cancel-auto-advance' }
  | { type: 'dismiss-section-break' }
  | { type: 'submit'; now: number }
  | { type: 'replace'; session: ExamSession };

export interface ExamState {
  phase: ExamSession['phase'];
  session: ExamSession;
}

interface ExamContextValue {
  saveFailed: boolean;
  state: ExamState;
  dispatch: React.Dispatch<ExamAction>;
}

const ExamContext = createContext<ExamContextValue | null>(null);

export function ExamProvider({
  initialSession,
  children,
}: {
  initialSession: ExamSession;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(examReducer, {
    phase: initialSession.phase,
    session: initialSession,
  });
  const [saveFailed, setSaveFailed] = useState(false);

  // Persist the committed state before passive timer effects can complete and remove it.
  useLayoutEffect(() => {
    if (state.session.phase === 'in-progress' || state.session.phase === 'review') {
      // Never persist the transient shouldAutoAdvance flag;
      // it must always start false on restore to avoid accidental auto-advance.
      setSaveFailed(!saveCurrentSession({ ...state.session, shouldAutoAdvance: false }));
    }
  }, [state.session]);

  const value = useMemo(() => ({ state, dispatch, saveFailed }), [state, saveFailed]);

  return <ExamContext.Provider value={value}>{children}</ExamContext.Provider>;
}

export function useExam(): ExamContextValue {
  const context = useContext(ExamContext);

  if (!context) {
    throw new Error('useExam must be used inside ExamProvider.');
  }

  return context;
}

function examReducer(state: ExamState, action: ExamAction): ExamState {
  if (state.phase === 'complete' && action.type !== 'replace') return state;
  switch (action.type) {
    case 'dismiss-section-break':
      return { ...state, session: { ...state.session, sectionBreakSeen: true } };
    case 'answer': {
      if (state.session.expiresAt !== null && state.session.expiresAt <= Date.now()) return state;
      const index = state.session.questionIds.indexOf(action.questionId);
      if (index < 0 || (state.session.sectionTwoStartedAt != null && index < 20)) return state;
      const autoAdvanced = new Set(state.session.autoAdvancedIds);
      const isFirstAnswer = state.session.answers[action.questionId] === undefined;
      const alreadyAutoAdvanced = autoAdvanced.has(action.questionId);
      const shouldAutoAdvance = isFirstAnswer && !alreadyAutoAdvanced && state.session.autoAdvance;
      if (shouldAutoAdvance) {
        autoAdvanced.add(action.questionId);
      }
      const phase = state.session.instantFeedback ? 'review' : 'in-progress';

      return {
        phase,
        session: {
          ...state.session,
          phase,
          answers: {
            ...state.session.answers,
            [action.questionId]: action.optionId,
          },
          autoAdvancedIds: [...autoAdvanced],
          shouldAutoAdvance,
        },
      };
    }
    case 'next':
      return moveToIndex(
        state,
        Math.min(state.session.currentIndex + 1, state.session.questionIds.length - 1),
      );
    case 'previous':
      return moveToIndex(state, Math.max(state.session.currentIndex - 1, 0));
    case 'go-to':
      return moveToIndex(
        state,
        Math.max(0, Math.min(action.index, state.session.questionIds.length - 1)),
      );
    case 'toggle-flag': {
      const flagged = new Set(state.session.flaggedIds);

      if (flagged.has(action.questionId)) {
        flagged.delete(action.questionId);
      } else {
        flagged.add(action.questionId);
      }

      return {
        ...state,
        session: {
          ...state.session,
          flaggedIds: [...flagged],
          shouldAutoAdvance: false,
        },
      };
    }
    case 'set-instant-feedback': {
      const phase =
        action.value && currentQuestionAnswered(state.session) ? 'review' : 'in-progress';
      const previousAutoAdvance = state.session.instantFeedback
        ? state.session.previousAutoAdvance
        : state.session.autoAdvance;
      const nextAutoAdvance = action.value ? false : previousAutoAdvance;

      return {
        phase,
        session: {
          ...state.session,
          phase,
          instantFeedback: action.value,
          autoAdvance: nextAutoAdvance,
          previousAutoAdvance,
          shouldAutoAdvance: false,
          settings: {
            ...state.session.settings,
            instantFeedback: action.value,
            autoAdvance: nextAutoAdvance,
          },
        },
      };
    }
    case 'set-auto-advance': {
      // Only update previousAutoAdvance when turning OFF (save state for future restore).
      // When turning ON, preserve the existing previousAutoAdvance unchanged.
      const previousAutoAdvance = action.value
        ? state.session.previousAutoAdvance
        : state.session.autoAdvance;

      return {
        ...state,
        session: {
          ...state.session,
          autoAdvance: action.value,
          previousAutoAdvance,
          shouldAutoAdvance: false,
          settings: {
            ...state.session.settings,
            autoAdvance: action.value,
          },
        },
      };
    }
    case 'set-auto-advance-duration':
      if (state.session.autoAdvanceDurationMs === action.valueMs) return state;
      return {
        ...state,
        session: {
          ...state.session,
          autoAdvanceDurationMs: action.valueMs,
          settings: { ...state.session.settings, autoAdvanceDurationMs: action.valueMs },
        },
      };
    case 'cancel-auto-advance':
      if (!state.session.shouldAutoAdvance) return state;
      return {
        ...state,
        session: {
          ...state.session,
          shouldAutoAdvance: false,
        },
      };
    case 'submit':
      return {
        phase: 'complete',
        session: {
          ...state.session,
          phase: 'complete',
          completedAt: action.now,
        },
      };
    case 'replace':
      return {
        phase: action.session.phase,
        session: action.session,
      };
    default:
      return state;
  }
}

function moveToIndex(state: ExamState, index: number): ExamState {
  const isFull = state.session.mode === 'full-test' && state.session.questionIds.length === 40;
  if (isFull && state.session.sectionTwoStartedAt != null) index = Math.max(20, index);
  const beginSecond = isFull && index >= 20 && state.session.sectionTwoStartedAt == null;
  const now = Date.now();
  const questionId = state.session.questionIds[index];
  const phase =
    state.session.phase === 'complete'
      ? 'complete'
      : questionId !== undefined &&
          state.session.answers[questionId] &&
          state.session.instantFeedback
        ? 'review'
        : 'in-progress';

  return {
    phase,
    session: {
      ...state.session,
      phase,
      currentIndex: index,
      ...(beginSecond
        ? { sectionTwoStartedAt: now, expiresAt: now + 30 * 60000, sectionBreakSeen: false }
        : {}),
      shouldAutoAdvance: false,
    },
  };
}

function currentQuestionAnswered(session: ExamSession): boolean {
  const questionId = session.questionIds[session.currentIndex];
  return questionId !== undefined && Boolean(session.answers[questionId]);
}
