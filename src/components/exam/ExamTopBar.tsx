'use client';

import { Flag, LogOut, Menu, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Timer } from '@/components/exam/Timer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { THEME_KEY } from '@/lib/storage';

type Theme = 'light' | 'dark';

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
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    function syncTheme(): void {
      setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
    }

    syncTheme();
    window.addEventListener('storage', syncTheme);
    window.addEventListener('ns-learner-theme-change', syncTheme);

    return () => {
      window.removeEventListener('storage', syncTheme);
      window.removeEventListener('ns-learner-theme-change', syncTheme);
    };
  }, []);

  function toggleTheme(): void {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    try {
      window.localStorage.setItem(THEME_KEY, nextTheme);
      window.dispatchEvent(new Event('ns-learner-theme-change'));
    } catch {
      // Theme persistence is best-effort only.
    }
  }

  return (
    <header className="exam-top-bar" data-testid="exam-top-bar">
      <Button
        className="exam-top-bar__exit"
        tone="ghost"
        size="sm"
        icon={<LogOut aria-hidden="true" suppressHydrationWarning />}
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
          <Flag aria-hidden="true" suppressHydrationWarning />
          <span className="exam-top-bar__flag-label">{flaggedCount}</span>
        </Badge>
      </div>

      <Button
        aria-label="Open question navigator"
        className="exam-top-bar__icon-button"
        tone="ghost"
        size="icon"
        icon={<Menu aria-hidden="true" suppressHydrationWarning />}
        onClick={onOpenNavigator}
      />

      <Button
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        className="exam-top-bar__icon-button"
        tone="ghost"
        size="icon"
        icon={
          theme === 'dark' ? (
            <Sun aria-hidden="true" suppressHydrationWarning />
          ) : (
            <Moon aria-hidden="true" suppressHydrationWarning />
          )
        }
        onClick={toggleTheme}
      />
    </header>
  );
}
