import type { ReactNode } from 'react';

type BadgeTone = 'neutral' | 'brand' | 'success' | 'error' | 'warning';

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span className={['badge', `badge--${tone}`, className].filter(Boolean).join(' ')}>
      {children}
    </span>
  );
}
