import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ExamProvider, useExam } from '@/hooks/useExam';
import { useTimer } from '@/hooks/useTimer';
import { questions } from '@/lib/questions';
import { createExamSession } from '@/lib/session';
import ExamError from '@/app/exam/error';

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

it('an exam rendering error preserves the saved attempt and offers retry', () => {
  const session = createExamSession({ questions });
  localStorage.setItem('ns-exam-session-full-test', JSON.stringify(session));
  localStorage.setItem('nsLearner.currentSession', JSON.stringify(session));
  const reset = vi.fn();
  render(<ExamError reset={reset} />);
  expect(JSON.parse(localStorage.getItem('ns-exam-session-full-test')!).id).toBe(session.id);
  expect(JSON.parse(localStorage.getItem('nsLearner.currentSession')!).id).toBe(session.id);
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(reset).toHaveBeenCalledOnce();
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

it('instant feedback rejects queued answer changes until feedback is disabled', () => {
  const session = createExamSession({ questions, mode: 'assisted' });
  const questionId = session.questionIds[0]!;
  const { result } = renderHook(useExam, {
    wrapper: ({ children }) => <ExamProvider initialSession={session}>{children}</ExamProvider>,
  });
  act(() => result.current.dispatch({ type: 'answer', questionId, optionId: 'a' }));
  act(() => result.current.dispatch({ type: 'answer', questionId, optionId: 'b' }));
  expect(result.current.state.session.answers[questionId]).toBe('a');
  act(() => result.current.dispatch({ type: 'set-instant-feedback', value: false }));
  act(() => result.current.dispatch({ type: 'answer', questionId, optionId: 'b' }));
  expect(result.current.state.session.answers[questionId]).toBe('b');
});

it('requires confirmation before locking road rules, including navigator jumps', () => {
  const session = createExamSession({ questions });
  const { result } = renderHook(useExam, {
    wrapper: ({ children }) => <ExamProvider initialSession={session}>{children}</ExamProvider>,
  });
  act(() => result.current.dispatch({ type: 'go-to', index: 24 }));
  expect(result.current.state.session.currentIndex).toBe(0);
  expect(result.current.state.pendingSectionIndex).toBe(24);
  act(() => result.current.dispatch({ type: 'cancel-section' }));
  expect(result.current.state.session.sectionTwoStartedAt).toBeNull();
  act(() => result.current.dispatch({ type: 'go-to', index: 24 }));
  act(() => result.current.dispatch({ type: 'confirm-section' }));
  expect(result.current.state.session.currentIndex).toBe(24);
  expect(result.current.state.session.sectionTwoStartedAt).toBeTypeOf('number');
  act(() => result.current.dispatch({ type: 'go-to', index: 0 }));
  expect(result.current.state.session.currentIndex).toBe(20);
});

it('starts the second clock at the first deadline when resuming late', () => {
  const deadline = Date.now() - 45 * 60000;
  const session = { ...createExamSession({ questions }), expiresAt: deadline };
  const { result } = renderHook(useExam, {
    wrapper: ({ children }) => <ExamProvider initialSession={session}>{children}</ExamProvider>,
  });
  act(() => result.current.dispatch({ type: 'go-to', index: 20 }));
  expect(result.current.state.session.expiresAt).toBe(deadline + 30 * 60000);
  expect(result.current.state.pendingSectionIndex).toBeUndefined();
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
