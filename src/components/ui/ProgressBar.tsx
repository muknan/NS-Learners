import { memo } from 'react';

export const ProgressBar = memo(function ProgressBar({
  value,
  label,
  correct,
  incorrect,
  missed,
  total,
}: {
  value: number;
  label: string;
  correct?: number;
  incorrect?: number;
  missed?: number;
  total?: number;
}) {
  const clamped = Math.max(0, Math.min(100, value));

  // Simple single-segment mode (used outside results page)
  if (
    correct === undefined ||
    incorrect === undefined ||
    missed === undefined ||
    total === undefined ||
    total === 0
  ) {
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
  }

  const correctPct = Math.round((correct / total) * 100);
  const incorrectPct = Math.round((incorrect / total) * 100);
  const missedPct = 100 - correctPct - incorrectPct;

  return (
    <div
      className="progress progress--stacked"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label={label}
    >
      {correctPct > 0 && (
        <span
          className="progress__segment progress__segment--correct"
          style={{ inlineSize: `${correctPct}%` }}
        />
      )}
      {incorrectPct > 0 && (
        <span
          className="progress__segment progress__segment--incorrect"
          style={{ inlineSize: `${incorrectPct}%` }}
        />
      )}
      {missedPct > 0 && (
        <span
          className="progress__segment progress__segment--missed"
          style={{ inlineSize: `${missedPct}%` }}
        />
      )}
    </div>
  );
});
