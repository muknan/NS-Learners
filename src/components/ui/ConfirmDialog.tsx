'use client';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Clear',
  cancelLabel = 'Cancel',
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <Modal title={title} onClose={onCancel}>
      <div className="confirm-dialog">
        <p>{description}</p>
      </div>
      <footer className="modal__footer">
        <Button tone="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button tone="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </footer>
    </Modal>
  );
}
