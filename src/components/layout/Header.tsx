'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Moon, Play, Settings, Sun } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { SettingsPanel } from '@/components/layout/SettingsPanel';
import { useMounted } from '@/hooks/useMounted';
import { useTheme } from '@/hooks/useTheme';

export function Header() {
  const router = useRouter();
  const rawPathname = usePathname();
  const pathname = rawPathname.replace(/\/$/, '') || '/';
  const mounted = useMounted();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  function startExam(): void {
    router.push('/exam?mode=full-test');
  }

  return (
    <header className="site-header">
      <Link
        href="/"
        prefetch={false}
        className="site-logo"
        aria-label="NS Learner Test Practice — Home"
      >
        <span className="site-logo__mark" aria-hidden="true">
          NS
        </span>
        <span className="site-logo__text">
          <span className="site-logo__title">NS Learner Test</span>
          <span className="site-logo__sub">Class 7 Practice</span>
        </span>
      </Link>

      <nav className="site-nav" aria-label="Primary navigation">
        <Link aria-current={pathname === '/' ? 'page' : undefined} href="/" prefetch={false}>
          Home
        </Link>
        <Link
          aria-current={pathname === '/handbooks' ? 'page' : undefined}
          href="/handbooks"
          prefetch={false}
        >
          Handbooks
        </Link>
        <Link
          aria-current={pathname === '/flashcards' ? 'page' : undefined}
          href="/flashcards"
          prefetch={false}
        >
          Flashcards
        </Link>
        <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Settings">
          {mounted ? (
            <Settings aria-hidden="true" />
          ) : (
            <span className="icon-placeholder" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {mounted ? (
            theme === 'dark' ? (
              <Sun aria-hidden="true" />
            ) : (
              <Moon aria-hidden="true" />
            )
          ) : (
            <span className="icon-placeholder" aria-hidden="true" />
          )}
        </button>
        <Button
          icon={
            mounted ? (
              <Play aria-hidden="true" />
            ) : (
              <span className="icon-placeholder" aria-hidden="true" />
            )
          }
          onClick={startExam}
        >
          Start
        </Button>
      </nav>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}
