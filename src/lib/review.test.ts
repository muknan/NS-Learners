import { beforeEach, describe, expect, it, vi } from 'vitest';
import { collectMistakes, readReview, REVIEW_KEY, updateReview, type ReviewStore } from './review';
import { questions } from './questions';
import { createExamSession, completeSession } from './session';

function attempt(id: string) {
  const session = createExamSession({
    questions: questions.slice(0, 3),
    settings: {
      instantFeedback: false,
      questionCount: 'all',
      timerMinutes: null,
      autoAdvance: false,
      autoAdvanceDurationMs: 2000,
    },
  });
  session.id = id;
  session.answers[questions[0]!.id] = questions[0]!.options.find(
    (o) => o.id !== questions[0]!.correctId,
  )!.id;
  session.answers[questions[1]!.id] = questions[1]!.correctId;
  return completeSession(session);
}

describe('persistent Review', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });
  it('counts wrong answers once per completed attempt, excluding correct and unanswered', () => {
    const store: ReviewStore = { items: {}, countedAttempts: [] };
    const session = attempt('first');
    collectMistakes(store, [session, session, attempt('second')]);
    expect(Object.keys(store.items)).toEqual([questions[0]!.id]);
    expect(store.items[questions[0]!.id]?.wrongCount).toBe(2);
    collectMistakes(store, [{ ...attempt('unfinished'), phase: 'in-progress' }]);
    expect(store.items[questions[0]!.id]?.wrongCount).toBe(2);
  });
  it('keeps manual saves and does not re-add learned questions from old attempts', () => {
    const id = questions[0]!.id;
    const store: ReviewStore = {
      items: { [id]: { wrongCount: 0, saved: true, updatedAt: 0 } },
      countedAttempts: [],
    };
    const session = attempt('old');
    collectMistakes(store, [session]);
    expect(store.items[id]).toMatchObject({ saved: true, wrongCount: 1 });
    delete store.items[id];
    collectMistakes(store, [session]);
    expect(store.items[id]).toBeUndefined();
    collectMistakes(store, [attempt('new')]);
    expect(store.items[id]).toMatchObject({ saved: false, wrongCount: 1 });
  });
  it('reads the latest data for each mutation and reports storage failures', async () => {
    await updateReview((store) => collectMistakes(store, [attempt('one')]));
    await updateReview((store) => collectMistakes(store, [attempt('two')]));
    expect(readReview().items[questions[0]!.id]?.wrongCount).toBe(2);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Full');
    });
    await expect(
      updateReview((store) => {
        store.items = {};
      }),
    ).rejects.toThrow('Full');
    expect(readReview().items[questions[0]!.id]?.wrongCount).toBe(2);
  });
  it('does not overwrite unreadable saved data', async () => {
    localStorage.setItem(REVIEW_KEY, 'broken');
    await expect(updateReview(() => {})).rejects.toThrow();
    expect(localStorage.getItem(REVIEW_KEY)).toBe('broken');
  });
});
