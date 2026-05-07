'use client';

import { useEffect } from 'react';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export function ToastViewport({
  toasts,
  onDismiss,
  durationMs = 4000,
}: {
  toasts: readonly ToastMessage[];
  onDismiss: (id: string) => void;
  durationMs?: number;
}) {
  useEffect(() => {
    const timers = toasts.map((toast) => window.setTimeout(() => onDismiss(toast.id), durationMs));

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [durationMs, onDismiss, toasts]);

  if (!toasts.length) {
    return null;
  }

  return (
    <div className="toast-viewport" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div className={`toast toast--${toast.type}`} key={toast.id}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
