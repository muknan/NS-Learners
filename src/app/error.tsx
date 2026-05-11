'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error(error);
    }
  }, [error]);

  return (
    <html lang="en-CA">
      <body>
        <section className="error-state" role="alert">
          <h1>Something went wrong.</h1>
          <p>Try refreshing the page.</p>
          {error.digest ? <small>Error code: {error.digest}</small> : null}
          <Button onClick={reset}>Refresh</Button>
        </section>
      </body>
    </html>
  );
}
