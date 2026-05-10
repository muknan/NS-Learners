'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Moon, Play, Settings, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { SettingsPanel } from '@/components/layout/SettingsPanel';
import { THEME_KEY } from '@/lib/storage';

type Theme = 'light' | 'dark';

export function Header() {
  const router = useRouter();
  const rawPathname = usePathname();
  const pathname = rawPathname.replace(/\/$/, '') || '/';
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    function syncTheme(): void {
      const currentTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
      setTheme(currentTheme);
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
    } catch {
      // Theme persistence is best-effort only.
    }
    window.dispatchEvent(new Event('ns-learner-theme-change'));
  }

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
          <Settings aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </button>
        <Button icon={<Play aria-hidden="true" />} onClick={startExam}>
          Start
        </Button>
      </nav>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}
