'use client';

import { Button } from '@/components/ui/Button';

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <section className="error-state" role="alert">
      <h1>Something went wrong.</h1>
      <p>Try refreshing the page.</p>
      <Button onClick={reset}>Refresh</Button>
    </section>
  );
}
