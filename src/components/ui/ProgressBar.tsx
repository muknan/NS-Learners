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

  // Use exact fractional percentages so segments meet edge-to-edge.
  // A 0.01 % overlap on the last segment prevents sub-pixel rendering gaps.
  const correctPct = (correct / total) * 100;
  const incorrectPct = (incorrect / total) * 100;
  const missedPct = (missed / total) * 100 + 0.01;

  const legendItems: Array<{ label: string; count: number; dotClass: string }> = [];
  if (correct > 0)
    legendItems.push({
      label: 'Correct',
      count: correct,
      dotClass: 'progress__legend-dot--correct',
    });
  if (incorrect > 0)
    legendItems.push({
      label: 'Wrong',
      count: incorrect,
      dotClass: 'progress__legend-dot--incorrect',
    });
  if (missed > 0)
    legendItems.push({ label: 'Missed', count: missed, dotClass: 'progress__legend-dot--missed' });

  return (
    <>
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
      {legendItems.length > 0 && (
        <div className="progress__legend" aria-hidden="true">
          {legendItems.map((item) => (
            <span className="progress__legend-item" key={item.label}>
              <span className={`progress__legend-dot ${item.dotClass}`} aria-hidden="true" />
              {item.label} {item.count}
            </span>
          ))}
        </div>
      )}
    </>
  );
});
