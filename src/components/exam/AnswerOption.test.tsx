import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnswerOption } from '@/components/exam/AnswerOption';

describe('AnswerOption', () => {
  it('uses a button and calls onSelect when activated', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <AnswerOption
        correct={false}
        disabled={false}
        index={0}
        onSelect={onSelect}
        option={{ id: 'a', text: 'Stop completely' }}
        selected={false}
        showFeedback={false}
        wrong={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: /stop completely/i }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('has no obvious accessibility violations', async () => {
    const { container } = render(
      <AnswerOption
        correct
        disabled={false}
        index={1}
        onSelect={() => undefined}
        option={{ id: 'b', text: 'Yield the right of way' }}
        selected
        showFeedback
        wrong={false}
      />,
    );

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
