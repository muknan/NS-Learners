'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

const GUARD_DEPTH = 3;

// useLayoutEffect on the server triggers a React warning and is a no-op anyway;
// fall back to useEffect during SSR so we never warn.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

interface NavigationBlockerOptions {
  enabled: boolean;
  fallbackUrl?: string;
  stateKey: string;
  onBlocked: () => void;
}

/**
 * Blocks browser back/forward navigation while `enabled` is true and surfaces
 * an `onBlocked` callback so callers can show a leave-confirm dialog.
 *
 * Mobile WebKit (iOS Safari, Chrome iOS, Firefox iOS) requires history entries
 * to be created under a user-gesture token, otherwise back-presses pop the
 * "dummy" entries silently without firing `popstate`. To stay reliable across
 * platforms we arm the guard twice:
 *
 *   1. Synchronously during layout commit (useLayoutEffect), while the gesture
 *      token from the click that triggered the route transition is still
 *      valid. This is enough on most desktop browsers and on Safari/Firefox
 *      iOS in practice.
 *
 *   2. Defensively on the first user interaction inside the page (pointerdown
 *      / keydown in the capture phase) so the sentinel entries are recreated
 *      from inside a user-gesture handler. This catches Chrome iOS, which is
 *      stricter about which entries it treats as real and otherwise silently
 *      skips the first back-press of every freshly-mounted page.
 */
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

  useIsomorphicLayoutEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return undefined;
    }

    // Reset for a fresh guard setup on every mount/re-arm.
    bypassRef.current = false;
    armedRef.current = false;

    // Local flag (not a React ref) — its lifetime is exactly this effect.
    const gestureReinforced = { current: false };

    function armHistoryGuard(): void {
      if (armedRef.current) {
        return;
      }

      const baseState = isHistoryState(window.history.state) ? window.history.state : {};
      window.history.replaceState({ ...baseState, [`${stateKey}Base`]: true }, '');

      // Each pushed sentinel preserves the underlying Next.js / framework
      // state so soft-navigation metadata (router cache keys, scroll
      // positions, etc.) survives a back-then-cancel round-trip.
      for (let i = 0; i < GUARD_DEPTH; i++) {
        window.history.pushState({ ...baseState, [stateKey]: true, guardIndex: i }, '');
      }
      armedRef.current = true;
    }

    function reinforceUnderUserGesture(): void {
      // Only re-arm if we haven't already done so for this mount; otherwise
      // the back-stack would grow on every interaction.
      if (gestureReinforced.current) {
        return;
      }
      gestureReinforced.current = true;
      armedRef.current = false;
      armHistoryGuard();
    }

    function handlePopState(event: PopStateEvent): void {
      if (bypassRef.current) {
        return;
      }

      // If the popped state is not one of our sentinels (e.g. iOS swipe-back),
      // re-push the guard immediately so the user can't bypass the blocker.
      const state = isHistoryState(event.state) ? event.state : {};
      if (!state[stateKey]) {
        armedRef.current = false;
        armHistoryGuard();
      }

      // A popstate proves the previously-armed entries were honored, so the
      // gesture-reinforcement step is no longer needed.
      gestureReinforced.current = true;
      armedRef.current = false;
      armHistoryGuard();
      onBlockedRef.current();
    }

    function handlePageShow(event: PageTransitionEvent): void {
      if (event.persisted) {
        gestureReinforced.current = false;
        armedRef.current = false;
        armHistoryGuard();
      }
    }

    armHistoryGuard();
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('pageshow', handlePageShow);

    // Capture-phase, one-shot listeners on `document` so the handler runs
    // before any in-page handler can stop propagation. The first user touch
    // or keypress re-arms inside a real user-gesture window — critical for
    // Chrome iOS, harmless everywhere else.
    const captureOnce: AddEventListenerOptions = { capture: true, once: true };
    const captureRemove: EventListenerOptions = { capture: true };
    document.addEventListener('pointerdown', reinforceUnderUserGesture, captureOnce);
    document.addEventListener('keydown', reinforceUnderUserGesture, captureOnce);

    return () => {
      armedRef.current = false;
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('pointerdown', reinforceUnderUserGesture, captureRemove);
      document.removeEventListener('keydown', reinforceUnderUserGesture, captureRemove);
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
