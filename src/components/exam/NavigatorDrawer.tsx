'use client';

import { ArrowLeft, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { QuestionNav } from '@/components/exam/QuestionNav';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { lockBodyScroll } from '@/components/ui/scrollLock';
import type { ExamSession, Question } from '@/types/exam';

interface NavigatorDrawerProps {
  open: boolean;
  modeLabel: string;
  progress: {
    answered: number;
    total: number;
    percentage: number;
  };
  questionsById: Map<string, Question>;
  session: ExamSession;
  tip: string;
  onClose: () => void;
  onRequestExit: () => void;
  onSelect: (index: number) => void;
}

export function NavigatorDrawer({
  open,
  modeLabel,
  progress,
  questionsById,
  session,
  tip,
  onClose,
  onRequestExit,
  onSelect,
}: NavigatorDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousActiveElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableSelector =
      'a[href], button:not([disabled]), textarea, input, select, summary, [tabindex]:not([tabindex="-1"])';

    document.body.classList.add('exam-overlay-open');
    const unlockBodyScroll = lockBodyScroll();
    window.setTimeout(() => {
      drawerRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus();
    }, 0);

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !drawerRef.current) {
        return;
      }

      const focusable = [...drawerRef.current.querySelectorAll<HTMLElement>(focusableSelector)];
      const first = focusable[0];
      const last = focusable.at(-1);

      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('exam-overlay-open');
      unlockBodyScroll();
      window.removeEventListener('keydown', handleKeyDown);
      previousActiveElement?.focus();
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="navigator-drawer" role="presentation">
      <button
        aria-label="Close question navigator"
        className="navigator-drawer__backdrop"
        onClick={onClose}
        type="button"
      />
      <section
        aria-label="Question navigator"
        aria-modal="true"
        className="navigator-drawer__panel"
        data-testid="navigator-drawer"
        ref={drawerRef}
        role="dialog"
      >
        <header className="navigator-drawer__header">
          <div>
            <Badge tone={session.instantFeedback ? 'warning' : 'brand'}>
              {session.instantFeedback ? 'Instant feedback' : 'End-of-exam mode'}
            </Badge>
            <h2>{modeLabel}</h2>
          </div>
          <Button
            aria-label="Close question navigator"
            tone="ghost"
            size="icon"
            icon={<X aria-hidden="true" />}
            onClick={onClose}
          />
        </header>

        <div className="navigator-drawer__progress">
          <div className="progress-card__label">
            <span>{progress.answered} answered</span>
            <strong>
              {progress.answered}/{progress.total}
            </strong>
          </div>
          <ProgressBar value={progress.percentage} label="Exam progress" />
          {session.mode === 'assisted' ? <small>Did you know? {tip}</small> : null}
        </div>

        <div className="navigator-drawer__grid" data-testid="navigator-grid">
          <QuestionNav
            onSelect={(index) => {
              onSelect(index);
              onClose();
            }}
            questionsById={questionsById}
            session={session}
          />
        </div>

        <footer className="navigator-drawer__footer">
          <Button tone="ghost" icon={<ArrowLeft aria-hidden="true" />} onClick={onRequestExit}>
            Exit to home
          </Button>
        </footer>
      </section>
    </div>
  );
}
