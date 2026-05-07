import type { ReactNode } from 'react';

export function PageWrapper({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className="page-shell">
      {children}
    </main>
  );
}
