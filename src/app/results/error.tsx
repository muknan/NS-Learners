'use client';

import { ButtonLink } from '@/components/ui/Button';

export default function ResultsError() {
  return (
    <main className="page-shell">
      <section className="error-state" role="alert">
        <h1>Couldn't load your results.</h1>
        <p>The saved result could not be read.</p>
        <ButtonLink href="/">Go home</ButtonLink>
      </section>
    </main>
  );
}
