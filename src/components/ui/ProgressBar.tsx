import { memo } from 'react';

export const ProgressBar = memo(function ProgressBar({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label={label}
    >
      <span style={{ inlineSize: `${clamped}%` }} />
    </div>
  );
});
