'use client';

import { ArrowRight, Flag, Send, Settings2 } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Button } from '@/components/ui/Button';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';

interface ExamActionBarProps {
  autoAdvanceActive: boolean;
  autoAdvanceDurationMs: number;
  autoAdvance: boolean;
  flagged: boolean;
  instantFeedback: boolean;
  isLast: boolean;
  onFlag: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onToggleAutoAdvance: (value: boolean) => void;
  onToggleInstantFeedback: (value: boolean) => void;
}

export function ExamActionBar({
  autoAdvanceActive,
  autoAdvanceDurationMs,
  autoAdvance,
  flagged,
  instantFeedback,
  isLast,
  onFlag,
  onNext,
  onSubmit,
  onToggleAutoAdvance,
  onToggleInstantFeedback,
}: ExamActionBarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const toggleHint = getToggleHint(instantFeedback, autoAdvance, autoAdvanceDurationMs);

  useEffect(() => {
    if (!settingsOpen) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSettingsOpen(false);
      }
    }

    function handlePointerDown(event: PointerEvent): void {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [settingsOpen]);

  const toggles = (
    <div className="exam-action-bar__toggles">
      <ToggleSwitch
        id="instant-feedback-toggle"
        label="Instant feedback"
        checked={instantFeedback}
        onChange={onToggleInstantFeedback}
      />
      <ToggleSwitch
        id="auto-advance-toggle"
        label="Auto-advance"
        checked={autoAdvance}
        onChange={onToggleAutoAdvance}
      />
    </div>
  );

  return (
    <footer className="exam-action-bar" data-testid="exam-action-bar">
      <div className="exam-action-bar__settings">
        <div className="exam-action-bar__inline-settings">
          {toggles}
          {toggleHint ? <p className="exam-action-bar__hint">{toggleHint}</p> : null}
        </div>

        <div className="exam-action-bar__compact-settings" ref={popoverRef}>
          <Button
            aria-expanded={settingsOpen}
            aria-label="Exam settings"
            tone="ghost"
            size="icon"
            icon={<Settings2 aria-hidden="true" suppressHydrationWarning />}
            onClick={() => setSettingsOpen((open) => !open)}
          />
          {settingsOpen ? (
            <div className="exam-action-popover" role="dialog" aria-label="Exam settings">
              {toggles}
              {toggleHint ? <p className="exam-action-bar__hint">{toggleHint}</p> : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="exam-action-bar__primary">
        <Button
          aria-pressed={flagged}
          className="exam-action-bar__flag"
          icon={<Flag aria-hidden="true" suppressHydrationWarning />}
          onClick={onFlag}
          tone={flagged ? 'secondary' : 'ghost'}
        >
          {flagged ? 'Flagged' : 'Flag'}
        </Button>
        {isLast ? (
          <Button
            className="exam-action-bar__next"
            icon={<Send aria-hidden="true" suppressHydrationWarning />}
            onClick={onSubmit}
          >
            Submit
          </Button>
        ) : (
          <Button
            className={[
              'exam-action-bar__next',
              'next-button',
              autoAdvanceActive ? 'is-counting' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            icon={<ArrowRight aria-hidden="true" suppressHydrationWarning />}
            onClick={onNext}
            style={{ '--advance-duration': `${autoAdvanceDurationMs}ms` } as CSSProperties}
          >
            Next
          </Button>
        )}
      </div>
    </footer>
  );
}

function getToggleHint(
  instantFeedback: boolean,
  autoAdvance: boolean,
  autoAdvanceDurationMs: number,
): string {
  if (autoAdvance) {
    return `Auto-advancing in ${autoAdvanceDurationMs / 1000}s after each answer`;
  }

  if (instantFeedback) {
    return 'Tap Next to continue after each answer';
  }

  return '';
}
