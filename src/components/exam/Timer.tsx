import { Clock } from 'lucide-react';
import { formatDuration } from '@/hooks/useTimer';

export function Timer({ remaining }: { remaining: number | null }) {
  const urgent = remaining !== null && remaining <= 60;
  const warning = remaining !== null && remaining <= 300 && remaining > 60;

  const urgencySuffix = urgent ? ' — urgent' : warning ? ' — low time' : '';
  const accessibleLabel =
    remaining === null ? 'Timer off' : `${formatDuration(remaining)} remaining${urgencySuffix}`;

  return (
    <div
      className={urgent ? 'timer is-urgent' : warning ? 'timer is-warning' : 'timer'}
      aria-label={accessibleLabel}
    >
      <Clock aria-hidden="true" />
      <span aria-hidden="true">{remaining === null ? 'Timer off' : formatDuration(remaining)}</span>
    </div>
  );
}
