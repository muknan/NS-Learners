'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { lockBodyScroll } from '@/components/ui/scrollLock';

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = modalRef.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const unlock = lockBodyScroll();
    dialog?.showModal();
    return () => {
      dialog?.close();
      unlock();
      previous?.focus();
    };
  }, []);

  return (
    <dialog
      onPointerDown={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onCloseRef.current();
      }}
      onCancel={(event) => {
        event.preventDefault();
        onCloseRef.current();
      }}
      className="modal"
      ref={modalRef}
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <header className="modal__header">
        <h2 id={titleId}>{title}</h2>
        <Button tone="ghost" size="icon" onClick={onClose} aria-label="Close dialog">
          <X aria-hidden="true" />
        </Button>
      </header>
      {children}
    </dialog>
  );
}
