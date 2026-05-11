import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { AppChrome } from '@/components/layout/AppChrome';
import { CURRENT_SESSION_KEY, SESSION_CHANGE_EVENT } from '@/lib/storage';
import type { ExamSession } from '@/types/exam';

let pathname = '/';
const push = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push }),
}));

describe('AppChrome', () => {
  beforeEach(() => {
    pathname = '/';
    push.mockClear();
    window.localStorage.clear();
  });

  it('does not render the site header on exam routes', () => {
    pathname = '/exam';

    render(
      <AppChrome>
        <main>Exam route</main>
      </AppChrome>,
    );

    expect(screen.queryByLabelText(/home/i)).not.toBeInTheDocument();
    expect(screen.getByText('Exam route')).toBeInTheDocument();
  });

  it.each(['/', '/handbooks', '/results'])('renders the site header on %s', (route) => {
    pathname = route;

    render(
      <AppChrome>
        <main>Page route</main>
      </AppChrome>,
    );

    expect(screen.getByLabelText(/NS Learner Test Practice/i)).toBeInTheDocument();
  });

  it.each([
    ['/handbooks/', 'Handbooks'],
    ['/flashcards/', 'Flashcards'],
  ])('marks the %s nav link active with trailing slashes', (route, label) => {
    pathname = route;

    render(
      <AppChrome>
        <main>Page route</main>
      </AppChrome>,
    );

    expect(screen.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
  });

  it('updates the exam nav action when the active session is cleared', async () => {
    window.localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(createSession()));

    render(
      <AppChrome>
        <main>Page route</main>
      </AppChrome>,
    );

    expect(await screen.findByRole('button', { name: /resume/i })).toBeInTheDocument();

    act(() => {
      window.localStorage.removeItem(CURRENT_SESSION_KEY);
      window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
    });

    await waitFor(() => expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument());
  });
});

function createSession(): ExamSession {
  return {
    id: 'session-1',
    phase: 'in-progress',
    source: 'full',
    mode: 'assisted',
    questionIds: ['q1'],
    optionOrder: { q1: ['a', 'b', 'c', 'd'] },
    currentIndex: 0,
    answers: {},
    flaggedIds: [],
    instantFeedback: false,
    autoAdvance: false,
    previousAutoAdvance: false,
    autoAdvanceDurationMs: 3000,
    autoAdvancedIds: [],
    shouldAutoAdvance: false,
    settings: {
      instantFeedback: false,
      questionCount: null,
      timerMinutes: null,
      autoAdvance: false,
      autoAdvanceDurationMs: 3000,
    },
    startedAt: Date.now(),
    expiresAt: null,
    completedAt: null,
  };
}
