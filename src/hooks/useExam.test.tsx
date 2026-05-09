import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExamProvider, useExam } from '@/hooks/useExam';
import { createExamSession } from '@/lib/session';
import type { Question } from '@/types/exam';

const questions: Question[] = [
  {
    id: 'q-restore',
    category: 'rules',
    topic: 'right-of-way',
    difficulty: 'easy',
    text: 'Who has the right of way?',
    options: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
      { id: 'c', text: 'C' },
      { id: 'd', text: 'D' },
    ],
    correctId: 'a',
    explanation: 'Sample explanation.',
  },
];

function ToggleHarness() {
  const { state, dispatch } = useExam();

  return (
    <div>
      <span data-testid="auto-advance">{String(state.session.autoAdvance)}</span>
      <span data-testid="previous-auto-advance">{String(state.session.previousAutoAdvance)}</span>
      <button onClick={() => dispatch({ type: 'set-instant-feedback', value: true })} type="button">
        Enable instant feedback
      </button>
      <button
        onClick={() => dispatch({ type: 'set-instant-feedback', value: false })}
        type="button"
      >
        Disable instant feedback
      </button>
    </div>
  );
}

describe('useExam', () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('restores the previous auto-advance preference when instant feedback is disabled', async () => {
    const user = userEvent.setup();
    const session = createExamSession({ questions, mode: 'full-test' });

    render(
      <ExamProvider initialSession={session}>
        <ToggleHarness />
      </ExamProvider>,
    );

    expect(screen.getByTestId('auto-advance')).toHaveTextContent('true');

    await user.click(screen.getByRole('button', { name: 'Enable instant feedback' }));

    expect(screen.getByTestId('auto-advance')).toHaveTextContent('false');
    expect(screen.getByTestId('previous-auto-advance')).toHaveTextContent('true');

    await user.click(screen.getByRole('button', { name: 'Disable instant feedback' }));

    expect(screen.getByTestId('auto-advance')).toHaveTextContent('true');
  });
});
