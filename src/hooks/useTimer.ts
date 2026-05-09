'use client';

import { useEffect, useRef, useState } from 'react';

export function useTimer(expiresAt: number | null, onExpire: () => void): number | null {
  const [remaining, setRemaining] = useState(() => getRemainingSeconds(expiresAt));
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    let expired = false;

    function syncRemaining(): void {
      const nextRemaining = getRemainingSeconds(expiresAt);
      setRemaining(nextRemaining);

      if (!expired && nextRemaining !== null && nextRemaining <= 0) {
        expired = true;
        onExpireRef.current();
      }
    }

    syncRemaining();

    if (!expiresAt) {
      return undefined;
    }

    function handleVisibilityChange(): void {
      if (document.visibilityState === 'visible') {
        syncRemaining();
      }
    }

    const timer = window.setInterval(syncRemaining, 250);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [expiresAt]);

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
