'use client';

import type { AnswerOption, ExamSession } from '@/types/exam';
import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
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
  | { type: 'submit'; now: number }
  | { type: 'replace'; session: ExamSession };

export interface ExamState {
  phase: ExamSession['phase'];
  session: ExamSession;
}

interface ExamContextValue {
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

  useEffect(() => {
    if (state.session.phase === 'in-progress' || state.session.phase === 'review') {
      saveCurrentSession(state.session);
    }
  }, [state.session]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

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
  switch (action.type) {
    case 'answer': {
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
      const nextAutoAdvance = action.value ? false : state.session.autoAdvance;

      return {
        phase,
        session: {
          ...state.session,
          phase,
          instantFeedback: action.value,
          autoAdvance: nextAutoAdvance,
          shouldAutoAdvance: false,
          settings: {
            ...state.session.settings,
            feedbackMode: action.value ? 'instant' : 'deferred',
            instantFeedback: action.value,
            autoAdvance: nextAutoAdvance,
          },
        },
      };
    }
    case 'set-auto-advance': {
      return {
        ...state,
        session: {
          ...state.session,
          autoAdvance: action.value,
          shouldAutoAdvance: false,
          settings: {
            ...state.session.settings,
            autoAdvance: action.value,
          },
        },
      };
    }
    case 'set-auto-advance-duration':
      return {
        ...state,
        session: {
          ...state.session,
          autoAdvanceDurationMs: action.valueMs,
        },
      };
    case 'cancel-auto-advance':
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
      shouldAutoAdvance: false,
    },
  };
}

function currentQuestionAnswered(session: ExamSession): boolean {
  const questionId = session.questionIds[session.currentIndex];
  return questionId !== undefined && Boolean(session.answers[questionId]);
}
