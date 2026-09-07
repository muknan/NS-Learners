'use client';

import { Button, ButtonLink } from '@/components/ui/Button';

export default function ExamError({ reset }: { reset: () => void }) {
  return (
    <main className="page-shell">
      <section className="error-state" role="alert">
        <h1>Your session encountered an error.</h1>
        <p>
          Retry loading your saved attempt, or return home. Your saved answers have not been
          cleared.
        </p>
        <div className="results-actions">
          <Button onClick={reset}>Retry</Button>
          <ButtonLink href="/" tone="secondary">
            Go home
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
