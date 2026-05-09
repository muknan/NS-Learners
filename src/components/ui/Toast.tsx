'use client';

import { X } from 'lucide-react';
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
  if (!toasts.length) {
    return null;
  }

  return (
    <div className="toast-viewport" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem durationMs={durationMs} key={toast.id} onDismiss={onDismiss} toast={toast} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
  durationMs,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
  durationMs: number;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), durationMs);

    return () => window.clearTimeout(timer);
  }, [durationMs, onDismiss, toast.id]);

  return (
    <div className={`toast toast--${toast.type}`}>
      <span>{toast.message}</span>
      <button aria-label="Dismiss notification" onClick={() => onDismiss(toast.id)} type="button">
        <X aria-hidden="true" />
      </button>
    </div>
  );
}
