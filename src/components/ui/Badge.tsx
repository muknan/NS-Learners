import type { ReactNode } from 'react';

type BadgeTone = 'neutral' | 'brand' | 'success' | 'error' | 'warning';

export function Badge({
  children,
  tone = 'neutral',
  className = '',
  'aria-label': ariaLabel,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  'aria-label'?: string;
}) {
  return (
    <span
      aria-label={ariaLabel}
      className={['badge', `badge--${tone}`, className].filter(Boolean).join(' ')}
    >
      {children}
    </span>
  );
}
