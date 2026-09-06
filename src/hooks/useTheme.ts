'use client';

import { useEffect, useState } from 'react';
import { THEME_KEY } from '@/lib/storage';

export type Theme = 'light' | 'dark';

export function useTheme(): { theme: Theme; setTheme: (next: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    function sync(event?: Event): void {
      if (event instanceof StorageEvent && (event.key === THEME_KEY || event.key === null)) {
        const next = event.newValue === 'dark' ? 'dark' : 'light';
        document.documentElement.dataset.theme = next;
        document.documentElement.style.colorScheme = next;
      }
      setThemeState(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
    }

    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('ns-learner-theme-change', sync);

    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('ns-learner-theme-change', sync);
    };
  }, []);

  function setTheme(next: Theme): void {
    setThemeState(next);
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // Theme persistence is best-effort only.
    }
    window.dispatchEvent(new Event('ns-learner-theme-change'));
  }

  return { theme, setTheme };
}
