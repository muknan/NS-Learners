import { describe, expect, it } from 'vitest';
import { createExamSession, getOrderedOptions } from '@/lib/session';
import type { Question } from '@/types/exam';

const questions: Question[] = Array.from({ length: 8 }, (_, index) => ({
  id: `q-${index}`,
  category: index % 2 ? 'signs' : 'rules',
  section: index % 2 ? 'Road Sign Recognition' : 'Rules of the Road',
  topic: index % 2 ? 'road-signs' : 'right-of-way',
  difficulty: 'easy',
  text: `Question ${index}`,
  options: [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B' },
    { id: 'c', text: 'C' },
    { id: 'd', text: 'D' },
  ],
  correctId: 'a',
  explanation: 'Sample explanation.',
}));

describe('createExamSession', () => {
  it('creates a session with no repeated questions', () => {
    const session = createExamSession({
      questions,
      settings: {
        feedbackMode: 'deferred',
        instantFeedback: false,
        questionCount: 20,
        timerMinutes: 0,
        autoAdvance: false,
        autoAdvanceDurationMs: 3000,
      },
    });

    expect(new Set(session.questionIds).size).toBe(session.questionIds.length);
    expect(session.questionIds).toHaveLength(8);
  });

  it('stores shuffled option order without losing option identities', () => {
    const session = createExamSession({
      questions,
      settings: {
        feedbackMode: 'instant',
        instantFeedback: true,
        questionCount: 'all',
        timerMinutes: 30,
        autoAdvance: true,
        autoAdvanceDurationMs: 3000,
      },
    });
    const firstQuestion = questions.find((question) => question.id === session.questionIds[0]);

    expect(firstQuestion).toBeDefined();
    expect(
      getOrderedOptions(firstQuestion as Question, session)
        .map((option) => option.id)
        .sort(),
    ).toEqual(['a', 'b', 'c', 'd']);
  });

  it('orders full-test sections as 20 rules followed by 20 signs', () => {
    const mixedBank: Question[] = Array.from({ length: 50 }, (_, index) => ({
      id: `mixed-${index}`,
      category: index % 2 === 0 ? 'rules' : 'signs',
      section: index % 2 === 0 ? 'Rules of the Road' : 'Road Sign Recognition',
      topic: index % 2 === 0 ? 'right-of-way' : 'road-signs',
      difficulty: 'easy',
      text: `Mixed question ${index}`,
      options: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
        { id: 'c', text: 'C' },
        { id: 'd', text: 'D' },
      ],
      correctId: 'a',
      explanation: 'Sample explanation.',
    }));
    const byId = new Map(mixedBank.map((question) => [question.id, question]));
    const session = createExamSession({ questions: mixedBank, mode: 'full-test' });

    expect(session.questionIds).toHaveLength(40);
    expect(session.questionIds.slice(0, 20).every((id) => byId.get(id)?.category === 'rules')).toBe(
      true,
    );
    expect(session.questionIds.slice(20).every((id) => byId.get(id)?.category === 'signs')).toBe(
      true,
    );
  });
});
