import { Clock } from 'lucide-react';
import { formatDuration } from '@/hooks/useTimer';

export function Timer({ remaining }: { remaining: number | null }) {
  const urgent = remaining !== null && remaining <= 60;
  const warning = remaining !== null && remaining <= 300 && remaining > 60;

  return (
    <div
      className={urgent ? 'timer is-urgent' : warning ? 'timer is-warning' : 'timer'}
      aria-label="Time remaining"
    >
      <Clock aria-hidden="true" />
      <span>{remaining === null ? 'Timer off' : formatDuration(remaining)}</span>
    </div>
  );
}
