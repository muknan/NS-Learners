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

    // Reset for a fresh guard setup on every mount/re-arm
    bypassRef.current = false;
    armedRef.current = false;

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

    function handlePageShow(event: PageTransitionEvent): void {
      if (event.persisted) {
        armedRef.current = false;
        armHistoryGuard();
      }
    }

    armHistoryGuard();
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      armedRef.current = false;
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [enabled, stateKey]);

  return () => {
    bypassRef.current = true;
    window.location.assign(fallbackUrl);
  };
}

function isHistoryState(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
