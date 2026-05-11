import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from '@/components/ui/ProgressBar';

describe('ProgressBar', () => {
  it('sets aria attributes correctly', () => {
    render(<ProgressBar value={60} label="Exam progress" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuenow', '60');
    expect(bar).toHaveAttribute('aria-label', 'Exam progress');
  });

  it('clamps values below 0 to 0', () => {
    render(<ProgressBar value={-10} label="test" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('clamps values above 100 to 100', () => {
    render(<ProgressBar value={150} label="test" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ProgressBar value={75} label="Score" />);
    expect((await axe(container)).violations).toHaveLength(0);
  });
});
