'use client';

import { useEffect, useRef, useState } from 'react';
import { readReview, REVIEW_CHANGE_EVENT, updateReview, type ReviewStore } from '@/lib/review';

export function useReview() {
  const [items, setItems] = useState<ReviewStore['items']>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  useEffect(() => {
    const sync = () => {
      try {
        setItems(readReview().items);
        setError('');
      } catch {
        setError('Review is unavailable. Check browser storage and reload to try again.');
      }
      setLoaded(true);
    };
    window.addEventListener('storage', sync);
    window.addEventListener(REVIEW_CHANGE_EVENT, sync);
    void updateReview(() => {})
      .then(sync)
      .catch(() => {
        sync();
        setError('Could not save Review. Check browser storage and reload to try again.');
      });
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(REVIEW_CHANGE_EVENT, sync);
    };
  }, []);
  async function change(mutation: (store: ReviewStore) => void) {
    if (busy.current) return null;
    busy.current = true;
    try {
      await updateReview(mutation);
      setError('');
      return true;
    } catch {
      setError('Could not save this change. Check browser storage and try again.');
      return false;
    } finally {
      busy.current = false;
    }
  }
  return { items, loaded, error, change };
}
