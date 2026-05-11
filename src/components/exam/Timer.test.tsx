import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { render, screen } from '@testing-library/react';
import { Timer } from '@/components/exam/Timer';

describe('Timer', () => {
  it('renders "Timer off" when remaining is null', () => {
    render(<Timer remaining={null} />);
    expect(screen.getByText('Timer off')).toBeInTheDocument();
    expect(screen.getByLabelText('Timer off')).toBeInTheDocument();
  });

  it('formats seconds correctly and has no urgent/warning class when > 300s', () => {
    const { container } = render(<Timer remaining={350} />);
    expect(screen.getByText('05:50')).toBeInTheDocument();
    expect(container.firstChild).not.toHaveClass('is-urgent');
    expect(container.firstChild).not.toHaveClass('is-warning');
  });

  it('applies is-warning class when remaining is between 61 and 300', () => {
    const { container } = render(<Timer remaining={90} />);
    expect(screen.getByText('01:30')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('is-warning');
  });

  it('applies is-urgent class when remaining is 60 or below', () => {
    const { container } = render(<Timer remaining={25} />);
    expect(screen.getByText('00:25')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('is-urgent');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Timer remaining={120} />);
    expect((await axe(container)).violations).toHaveLength(0);
  });
});
