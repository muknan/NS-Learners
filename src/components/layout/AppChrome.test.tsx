import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppChrome } from '@/components/layout/AppChrome';

let pathname = '/';
const push = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push }),
}));

describe('AppChrome', () => {
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
});
