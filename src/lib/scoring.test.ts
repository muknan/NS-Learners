import { describe, expect, it } from 'vitest';
import { getMissedQuestionIds, scoreSession } from '@/lib/scoring';
import type { ExamSession, Question } from '@/types/exam';

const sampleQuestions: Question[] = [
  {
    id: 'q-1',
    category: 'rules',
    section: 'Rules of the Road',
    topic: 'speed-limits',
    difficulty: 'easy',
    text: 'What is the default urban speed limit?',
    options: [
      { id: 'a', text: '50 km/h' },
      { id: 'b', text: '80 km/h' },
      { id: 'c', text: '30 km/h' },
      { id: 'd', text: '100 km/h' },
    ],
    correctId: 'a',
    explanation: 'The default business or residential limit is 50 km/h unless posted.',
  },
  {
    id: 'q-2',
    category: 'signs',
    section: 'Road Sign Recognition',
    topic: 'road-signs',
    difficulty: 'easy',
    text: 'What does an octagon mean?',
    options: [
      { id: 'a', text: 'Yield' },
      { id: 'b', text: 'Stop' },
      { id: 'c', text: 'One way' },
      { id: 'd', text: 'No parking' },
    ],
    correctId: 'b',
    explanation: 'A red octagon means stop completely.',
  },
];

const questionMap = new Map(sampleQuestions.map((question) => [question.id, question]));

function makeSession(answers: ExamSession['answers']): ExamSession {
  return {
    id: 'session-1',
    phase: 'complete',
    source: 'full',
    mode: 'full-test',
    questionIds: sampleQuestions.map((question) => question.id),
    optionOrder: {
      'q-1': ['a', 'b', 'c', 'd'],
      'q-2': ['a', 'b', 'c', 'd'],
    },
    currentIndex: 0,
    answers,
    flaggedIds: [],
    instantFeedback: false,
    autoAdvance: false,
    previousAutoAdvance: false,
    autoAdvanceDurationMs: 3000,
    autoAdvancedIds: [],
    shouldAutoAdvance: false,
    settings: {
      feedbackMode: 'deferred',
      instantFeedback: false,
      questionCount: 20,
      timerMinutes: 0,
      autoAdvance: false,
      autoAdvanceDurationMs: 3000,
    },
    startedAt: 1,
    expiresAt: null,
    completedAt: 2,
  };
}

describe('scoreSession', () => {
  it('scores totals, percentages, pass state, and section breakdowns', () => {
    const score = scoreSession(makeSession({ 'q-1': 'a', 'q-2': 'a' }), questionMap);

    expect(score.correct).toBe(1);
    expect(score.total).toBe(2);
    expect(score.percentage).toBe(50);
    expect(score.passed).toBe(false);
    expect(score.bySection).toHaveLength(1);
  });

  it('returns missed question ids for wrong or unanswered answers', () => {
    expect(getMissedQuestionIds(makeSession({ 'q-1': 'a' }), questionMap)).toEqual(['q-2']);
  });
});
