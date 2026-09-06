import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { questions } from '@/lib/questions';
import { createExamSession } from '@/lib/session';
import { scoreSession } from '@/lib/scoring';
import {
  readAdvanceDuration,
  readSessionForMode,
  saveSessionForMode,
  saveCompletedSession,
} from '@/lib/storage';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('persisted exam correctness', () => {
  it('preserves retake mode and its independent slot', () => {
    const full = createExamSession({ questions });
    saveSessionForMode(full);
    const retake = createExamSession({ questions, mode: 'retake', questionIds: ['q-001'] });
    saveSessionForMode(retake);
    expect(readSessionForMode('retake')?.mode).toBe('retake');
    expect(readSessionForMode('full-test')?.id).toBe(full.id);
  });

  it.each(['duplicate', 'index', 'order', 'unknown'] as const)('rejects %s corruption', (kind) => {
    const session = createExamSession({ questions, mode: 'all-questions' });
    const id = session.questionIds[0]!;
    if (kind === 'duplicate') session.questionIds[1] = id;
    if (kind === 'index') session.currentIndex = 999;
    if (kind === 'order') session.optionOrder[id] = [];
    if (kind === 'unknown') session.questionIds[0] = 'q-999999';
    localStorage.setItem('ns-exam-session-all-questions', JSON.stringify(session));
    expect(readSessionForMode('all-questions')).toBeNull();
  });

  it('does not pass an interleaved test with only twelve correct rules', () => {
    const rules = questions.filter((q) => q.category === 'rules').slice(0, 20);
    const signs = questions.filter((q) => q.category === 'signs').slice(0, 20);
    const session = createExamSession({ questions });
    session.questionIds = rules.flatMap((q, i) => [q.id, signs[i]!.id]);
    session.answers = Object.fromEntries(
      [...rules.slice(0, 6), ...rules.slice(10, 16), ...signs].map((q) => [q.id, q.correctId]),
    );
    expect(scoreSession(session, new Map(questions.map((q) => [q.id, q]))).passed).toBe(false);
  });

  it('filters drills within the domain selector', () => {
    const session = createExamSession({ questions, mode: 'rules-drill' });
    expect(session.questionIds).toHaveLength(60);
    expect(
      session.questionIds.every((id) => questions.find((q) => q.id === id)?.category === 'rules'),
    ).toBe(true);
  });

  it('reports completion write failure without deleting the active session', () => {
    const session = createExamSession({ questions });
    saveSessionForMode(session);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    expect(saveCompletedSession(session)).toBe(false);
    expect(readSessionForMode('full-test')?.id).toBe(session.id);
  });

  it('uses three seconds when no delay preference is saved', () => {
    expect(readAdvanceDuration()).toBe(3);
  });
});
