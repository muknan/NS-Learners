'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [online, setOnline] = useState(true);
  const examActive = pathname?.startsWith('/exam') ?? false;
  const flashcardsActive = pathname?.startsWith('/flashcards') ?? false;

  useEffect(() => {
    function syncOnline(): void {
      setOnline(navigator.onLine);
    }

    syncOnline();
    window.addEventListener('online', syncOnline);
    window.addEventListener('offline', syncOnline);

    return () => {
      window.removeEventListener('online', syncOnline);
      window.removeEventListener('offline', syncOnline);
    };
  }, []);

  if (flashcardsActive) {
    return (
      <div className="flashcards-root">
        {!online ? (
          <div className="offline-banner">You're offline - using cached content</div>
        ) : null}
        <Header />
        {children}
      </div>
    );
  }

  return (
    <>
      {!online ? <div className="offline-banner">You're offline - using cached content</div> : null}
      {examActive ? null : <Header />}
      {children}
      {examActive ? null : <Footer />}
    </>
  );
}
