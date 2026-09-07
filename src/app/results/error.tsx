'use client';

import { Button, ButtonLink } from '@/components/ui/Button';

export default function ResultsError({ reset }: { reset: () => void }) {
  return (
    <main className="page-shell">
      <section className="error-state" role="alert">
        <h1>Couldn't load your results.</h1>
        <p>The saved result could not be read.</p>
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
