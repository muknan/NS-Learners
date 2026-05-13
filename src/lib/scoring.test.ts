import { describe, expect, it } from 'vitest';
import { getMissedQuestionIds, scoreSession } from '@/lib/scoring';
import type { ExamSession, ModeId, Question } from '@/types/exam';

const sampleQuestions: Question[] = [
  {
    id: 'q-1',
    category: 'rules',
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

function makeSession(
  answers: ExamSession['answers'],
  questions: Question[] = sampleQuestions,
  mode: ModeId = 'full-test',
): ExamSession {
  const optionIds: ExamSession['optionOrder'][string] = ['a', 'b', 'c', 'd'];

  return {
    id: 'session-1',
    phase: 'complete',
    source: 'full',
    mode,
    questionIds: questions.map((question) => question.id),
    optionOrder: Object.fromEntries(questions.map((question) => [question.id, optionIds])),
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
    const session = makeSession({ 'q-1': 'a', 'q-2': 'a' });
    const score = scoreSession(session, questionMap, session.mode);

    expect(score.correct).toBe(1);
    expect(score.incorrect).toBe(1);
    expect(score.missed).toBe(0);
    expect(score.total).toBe(2);
    expect(score.percentage).toBe(50);
    expect(score.passed).toBe(false);
    expect(score.bySection).toHaveLength(1);
    expect(score.bySection[0]).toMatchObject({
      section: 'Practice',
      correct: 1,
      incorrect: 1,
      missed: 0,
      total: 2,
      percentage: 50,
    });
  });

  it('returns missed question ids for wrong or unanswered answers', () => {
    expect(getMissedQuestionIds(makeSession({ 'q-1': 'a' }), questionMap)).toEqual(['q-2']);
  });

  it('does not split non-full-test 40-question sessions into exam sections', () => {
    const questions = Array.from({ length: 40 }, (_, index) => ({
      ...sampleQuestions[index % sampleQuestions.length]!,
      id: `q-${index + 1}`,
    }));
    const questionsById = new Map(questions.map((question) => [question.id, question]));
    const answers = Object.fromEntries(
      questions.map((question) => [question.id, question.correctId]),
    ) as ExamSession['answers'];
    const session = makeSession(answers, questions, 'all-questions');
    const score = scoreSession(session, questionsById, session.mode);

    expect(score.bySection).toEqual([
      {
        section: 'Practice',
        correct: 40,
        incorrect: 0,
        missed: 0,
        total: 40,
        percentage: 100,
      },
    ]);
  });
});
