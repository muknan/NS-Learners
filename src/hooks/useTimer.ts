'use client';

import { useEffect, useState } from 'react';

export function useTimer(expiresAt: number | null, onExpire: () => void): number | null {
  const [remaining, setRemaining] = useState(() => getRemainingSeconds(expiresAt));

  useEffect(() => {
    setRemaining(getRemainingSeconds(expiresAt));

    if (!expiresAt) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      const nextRemaining = getRemainingSeconds(expiresAt);
      setRemaining(nextRemaining);

      if (nextRemaining !== null && nextRemaining <= 0) {
        window.clearInterval(timer);
        onExpire();
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [expiresAt, onExpire]);

  return remaining;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) {
    return 'Off';
  }

  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function getRemainingSeconds(expiresAt: number | null): number | null {
  if (!expiresAt) {
    return null;
  }

  return Math.ceil((expiresAt - Date.now()) / 1000);
}
