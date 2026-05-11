'use client';

import { useEffect, useRef } from 'react';

interface NavigationBlockerOptions {
  enabled: boolean;
  fallbackUrl?: string;
  stateKey: string;
  onBlocked: () => void;
}

export function useNavigationBlocker({
  enabled,
  fallbackUrl = '/',
  stateKey,
  onBlocked,
}: NavigationBlockerOptions): () => void {
  const bypassRef = useRef(false);
  const armedRef = useRef(false);
  const onBlockedRef = useRef(onBlocked);

  onBlockedRef.current = onBlocked;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return undefined;
    }

    function armHistoryGuard(): void {
      if (armedRef.current) {
        return;
      }

      const currentState = isHistoryState(window.history.state) ? window.history.state : {};
      window.history.replaceState({ ...currentState, [`${stateKey}Base`]: true }, '');
      window.history.pushState({ [stateKey]: true }, '');
      armedRef.current = true;
    }

    function handlePopState(): void {
      if (bypassRef.current) {
        return;
      }

      armedRef.current = false;
      armHistoryGuard();
      onBlockedRef.current();
    }

    armHistoryGuard();
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [enabled, stateKey]);

  return () => {
    bypassRef.current = true;
    if (window.history.length <= 2) {
      window.location.assign(fallbackUrl);
      return;
    }

    window.history.go(-2);
  };
}

function isHistoryState(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
