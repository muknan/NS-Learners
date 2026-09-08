import { z } from 'zod';
import { getQuestionById } from '@/lib/questions';
import { readHistory, readHistorySession } from '@/lib/storage';
import type { ExamSession } from '@/types/exam';

export const REVIEW_KEY = 'nsLearner.review';
export const REVIEW_CHANGE_EVENT = 'nsLearner.reviewChange';
const schema = z.object({
  items: z.record(
    z.object({
      wrongCount: z.number().int().nonnegative(),
      saved: z.boolean(),
      updatedAt: z.number().finite(),
    }),
  ),
  countedAttempts: z.array(z.string()),
});
export type ReviewStore = z.infer<typeof schema>;
export type ReviewEntry = ReviewStore['items'][string];

export function readReview(): ReviewStore {
  const raw = localStorage.getItem(REVIEW_KEY);
  return raw ? schema.parse(JSON.parse(raw)) : { items: {}, countedAttempts: [] };
}

// Keep the attempt ledger when a question is learned, so history cannot add it back.
export function collectMistakes(store: ReviewStore, sessions: ExamSession[]): void {
  for (const session of sessions) {
    if (session.phase !== 'complete' || store.countedAttempts.includes(session.id)) continue;
    for (const id of session.questionIds) {
      const question = getQuestionById(id);
      const answer = session.answers[id];
      if (!question || !answer || answer === question.correctId) continue;
      const previous = store.items[id];
      store.items[id] = {
        wrongCount: (previous?.wrongCount ?? 0) + 1,
        saved: previous?.saved ?? false,
        updatedAt: Math.max(previous?.updatedAt ?? 0, session.completedAt ?? session.startedAt),
      };
    }
    store.countedAttempts.push(session.id);
  }
}

export async function updateReview(change: (store: ReviewStore) => void): Promise<void> {
  const write = () => {
    const store = readReview();
    collectMistakes(
      store,
      readHistory().flatMap((entry) => {
        const session = readHistorySession(entry.id);
        return session ? [session] : [];
      }),
    );
    change(store);
    localStorage.setItem(REVIEW_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event(REVIEW_CHANGE_EVENT));
  };
  if (navigator.locks) await navigator.locks.request(REVIEW_KEY, write);
  else write();
}

export function reviewPriority(count: number): { tone: string; label: string } {
  if (count >= 4) return { tone: 'high', label: 'Focus here' };
  if (count >= 2) return { tone: 'medium', label: 'Practice more' };
  return { tone: 'low', label: 'Refresh' };
}
