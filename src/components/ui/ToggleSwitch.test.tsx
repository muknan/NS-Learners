import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ToggleSwitch } from './ToggleSwitch';

describe('ToggleSwitch', () => {
  it('activates once through the label, track, Space and Enter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ToggleSwitch id="test-switch" label="Setting" checked={false} onChange={onChange} />);
    const control = screen.getByRole('switch', { name: 'Setting: off' });
    await user.click(screen.getByText('Setting'));
    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
    onChange.mockClear();
    await user.click(control);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
    onChange.mockClear();
    await user.keyboard(' ');
    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
    onChange.mockClear();
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('keeps disabled controls inert through the label and track', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ToggleSwitch id="disabled-switch" label="Setting" checked disabled onChange={onChange} />,
    );
    await user.click(screen.getByText('Setting'));
    await user.click(screen.getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });
});
