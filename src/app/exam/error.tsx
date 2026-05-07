'use client';

import { useEffect } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { clearCurrentSession } from '@/lib/storage';

export default function ExamError() {
  useEffect(() => {
    clearCurrentSession();
  }, []);

  return (
    <main className="page-shell">
      <section className="error-state" role="alert">
        <h1>Your session encountered an error.</h1>
        <p>Start fresh or return home.</p>
        <div className="results-actions">
          <ButtonLink href="/exam?mode=full-test">Start fresh</ButtonLink>
          <ButtonLink href="/" tone="secondary">
            Go home
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
