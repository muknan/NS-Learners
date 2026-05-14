'use client';

import { Flag, LogOut, Menu, Moon, Sun } from 'lucide-react';
import { Timer } from '@/components/exam/Timer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useMounted } from '@/hooks/useMounted';
import { useTheme } from '@/hooks/useTheme';

interface ExamTopBarProps {
  modeLabel: string;
  questionNumber: number;
  totalQuestions: number;
  remaining: number | null;
  flaggedCount: number;
  onExit: () => void;
  onOpenNavigator: () => void;
}

export function ExamTopBar({
  modeLabel,
  questionNumber,
  totalQuestions,
  remaining,
  flaggedCount,
  onExit,
  onOpenNavigator,
}: ExamTopBarProps) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    <header className="exam-top-bar" data-testid="exam-top-bar">
      <Button
        className="exam-top-bar__exit"
        tone="ghost"
        size="sm"
        icon={<LogOut aria-hidden="true" />}
        onClick={onExit}
      >
        Exit
      </Button>

      <strong className="exam-top-bar__title">
        {modeLabel} <span aria-hidden="true">·</span> Q {questionNumber} / {totalQuestions}
      </strong>

      <div className="exam-top-bar__metrics">
        <Timer remaining={remaining} />
        <Badge tone={flaggedCount ? 'warning' : 'neutral'}>
          <Flag aria-hidden="true" />
          <span className="exam-top-bar__flag-label">{flaggedCount}</span>
        </Badge>
      </div>

      <Button
        aria-label="Open question navigator"
        className="exam-top-bar__icon-button"
        tone="ghost"
        size="icon"
        icon={<Menu aria-hidden="true" />}
        onClick={onOpenNavigator}
      />

      <Button
        aria-label={
          mounted ? `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode` : 'Toggle color theme'
        }
        className="exam-top-bar__icon-button"
        tone="ghost"
        size="icon"
        icon={
          mounted ? (
            theme === 'dark' ? (
              <Sun aria-hidden="true" />
            ) : (
              <Moon aria-hidden="true" />
            )
          ) : (
            <span className="icon-placeholder" aria-hidden="true" />
          )
        }
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />
    </header>
  );
}
