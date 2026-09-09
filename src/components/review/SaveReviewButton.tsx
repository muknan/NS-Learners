'use client';

import { Bookmark } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useReview } from '@/hooks/useReview';

export function SaveReviewButton({
  questionId,
  onSave,
}: {
  questionId: string;
  onSave?: (() => void) | undefined;
}) {
  const { items, loaded, error, change } = useReview();
  const [errorOpen, setErrorOpen] = useState(false);
  const saved = items[questionId]?.saved ?? false;
  return (
    <div className="review-save-control">
      <Button
        size="sm"
        tone="ghost"
        className={saved ? 'review-saved' : ''}
        disabled={!loaded}
        aria-label={saved ? 'Saved to Review' : 'Save to Review'}
        aria-pressed={saved}
        icon={<Bookmark aria-hidden="true" />}
        onClick={() => {
          onSave?.();
          void change((store) => {
            const item = store.items[questionId] ?? {
              wrongCount: 0,
              saved: false,
              updatedAt: Date.now(),
            };
            item.saved = !item.saved;
            if (!item.saved && !item.wrongCount) delete store.items[questionId];
            else store.items[questionId] = item;
          }).then((success) => {
            if (success === false) setErrorOpen(true);
          });
        }}
      >
        {saved ? 'Saved to Review' : 'Save to Review'}
      </Button>
      {errorOpen ? (
        <Modal title="Review could not be saved" onClose={() => setErrorOpen(false)}>
          <div className="confirm-dialog">
            <p role="alert">{error}</p>
            <p>
              Your exam answers are unchanged. Close this dialog and try saving to Review again.
            </p>
          </div>
          <footer className="modal__footer">
            <Button onClick={() => setErrorOpen(false)}>Back to question</Button>
          </footer>
        </Modal>
      ) : null}
    </div>
  );
}
