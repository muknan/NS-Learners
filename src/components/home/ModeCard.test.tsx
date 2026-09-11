import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { ModeCard } from './ModeCard';

it('starts exactly once from the button, and ignores non-mouse card activation', async () => {
  const onStart = vi.fn();
  render(
    <ModeCard onStart={onStart}>
      <p>Description</p>
      <button onClick={onStart}>Start</button>
    </ModeCard>,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole('button'));
  expect(onStart).toHaveBeenCalledTimes(1);
  onStart.mockClear();
  for (const pointerType of ['touch', 'pen', '']) {
    fireEvent.pointerDown(screen.getByText('Description'), { pointerType });
    fireEvent(
      screen.getByText('Description'),
      new PointerEvent('click', { bubbles: true, pointerType: 'mouse', detail: 1 }),
    );
  }
  expect(onStart).not.toHaveBeenCalled();
  fireEvent.pointerDown(screen.getByText('Description'), { pointerType: 'mouse' });
  fireEvent(
    screen.getByText('Description'),
    new PointerEvent('click', { bubbles: true, pointerType: 'mouse', detail: 1 }),
  );
  expect(onStart).toHaveBeenCalledTimes(1);
  fireEvent.pointerDown(screen.getByText('Description'), { pointerType: 'mouse' });
  fireEvent.pointerCancel(screen.getByText('Description'));
  fireEvent(
    screen.getByText('Description'),
    new PointerEvent('click', { bubbles: true, pointerType: 'mouse', detail: 1 }),
  );
  expect(onStart).toHaveBeenCalledTimes(1);
});
