import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ExamProvider, useExam } from '@/hooks/useExam';
import { useTimer } from '@/hooks/useTimer';
import { questions } from '@/lib/questions';
import { createExamSession } from '@/lib/session';

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

it('does not accept answers after a section deadline while a save is pending', () => {
  const session = { ...createExamSession({ questions }), expiresAt: Date.now() - 1 };
  const { result } = renderHook(useExam, {
    wrapper: ({ children }) => <ExamProvider initialSession={session}>{children}</ExamProvider>,
  });
  act(() =>
    result.current.dispatch({ type: 'answer', questionId: session.questionIds[0]!, optionId: 'a' }),
  );
  expect(result.current.state.session.answers).toEqual({});
});

it('allocates thirty minutes to the first full-test section', () => {
  const session = createExamSession({ questions });
  expect(session.expiresAt! - session.startedAt).toBe(30 * 60000);
});

it('completed state cannot be reopened by a queued answer', () => {
  const session = createExamSession({ questions, mode: 'assisted' });
  const { result } = renderHook(useExam, {
    wrapper: ({ children }) => <ExamProvider initialSession={session}>{children}</ExamProvider>,
  });
  act(() => result.current.dispatch({ type: 'submit', now: Date.now() }));
  act(() =>
    result.current.dispatch({ type: 'answer', questionId: session.questionIds[0]!, optionId: 'a' }),
  );
  expect(result.current.state.phase).toBe('complete');
  expect(result.current.state.session.answers).toEqual({});
});

it('unchanged delay does not rewrite session state', () => {
  const session = createExamSession({ questions });
  const { result } = renderHook(useExam, {
    wrapper: ({ children }) => <ExamProvider initialSession={session}>{children}</ExamProvider>,
  });
  const before = result.current.state;
  act(() =>
    result.current.dispatch({
      type: 'set-auto-advance-duration',
      valueMs: session.autoAdvanceDurationMs,
    }),
  );
  expect(result.current.state).toBe(before);
});

it('backward clock cannot increase remaining seconds', () => {
  vi.useFakeTimers();
  const now = Date.now();
  const onExpire = vi.fn();
  const { result } = renderHook(() => useTimer(now + 60000, onExpire));
  act(() => {
    vi.setSystemTime(now - 3600000);
    vi.advanceTimersByTime(500);
  });
  expect(result.current).toBeLessThanOrEqual(60);
});
