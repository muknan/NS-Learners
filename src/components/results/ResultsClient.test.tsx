import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultsClient } from '@/components/results/ResultsClient';
import { createExamSession, completeSession } from '@/lib/session';
import type * as StorageModule from '@/lib/storage';
import type { Question } from '@/types/exam';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock('@/lib/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof StorageModule>();
  return { ...actual, readCompletedSession: vi.fn() };
});

import { readCompletedSession } from '@/lib/storage';

const mockReadCompletedSession = vi.mocked(readCompletedSession);

const testQuestions: Question[] = [
  {
    id: 'q-001',
    category: 'rules',
    topic: 'speed-limits',
    difficulty: 'easy',
    text: 'What is the default urban speed limit in Nova Scotia?',
    options: [
      { id: 'a', text: '50 km/h' },
      { id: 'b', text: '80 km/h' },
      { id: 'c', text: '30 km/h' },
      { id: 'd', text: '100 km/h' },
    ],
    correctId: 'a',
    explanation: 'The default speed limit in urban areas is 50 km/h unless otherwise posted.',
  },
  {
    id: 'q-002',
    category: 'signs',
    topic: 'road-signs',
    difficulty: 'easy',
    text: 'What shape is a stop sign?',
    options: [
      { id: 'a', text: 'Triangle' },
      { id: 'b', text: 'Circle' },
      { id: 'c', text: 'Octagon' },
      { id: 'd', text: 'Diamond' },
    ],
    correctId: 'c',
    explanation: 'Stop signs are octagonal and red.',
  },
];

describe('ResultsClient', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } });
  });

  it('shows empty state when no completed session exists', () => {
    mockReadCompletedSession.mockReturnValue(null);
    render(<ResultsClient questions={testQuestions} historyId={undefined} />);
    expect(screen.getByRole('heading', { name: /no completed exam found/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /start a new exam/i })).toBeInTheDocument();
  });

  it('renders score and breakdown when a completed session exists', () => {
    const session = createExamSession({
      questions: testQuestions,
      mode: 'assisted',
      questionIds: testQuestions.map((q) => q.id),
    });
    const completed = completeSession({
      ...session,
      answers: { 'q-001': 'a', 'q-002': 'c' },
    });
    mockReadCompletedSession.mockReturnValue(completed);

    render(<ResultsClient questions={testQuestions} historyId={undefined} />);
    expect(screen.getByText(/correct overall/i)).toBeInTheDocument();
    expect(screen.getByText(/breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/wrong answer review/i)).toBeInTheDocument();
  });

  it('disables "Retake missed only" when all answers are correct', () => {
    const session = createExamSession({
      questions: testQuestions,
      mode: 'assisted',
      questionIds: testQuestions.map((q) => q.id),
    });
    const completed = completeSession({
      ...session,
      answers: { 'q-001': 'a', 'q-002': 'c' },
    });
    mockReadCompletedSession.mockReturnValue(completed);

    render(<ResultsClient questions={testQuestions} historyId={undefined} />);
    expect(screen.getByRole('button', { name: /retake missed only/i })).toBeDisabled();
  });

  it('enables "Retake missed only" when there are wrong answers', () => {
    const session = createExamSession({
      questions: testQuestions,
      mode: 'assisted',
      questionIds: testQuestions.map((q) => q.id),
    });
    const completed = completeSession({
      ...session,
      answers: { 'q-001': 'b', 'q-002': 'a' },
    });
    mockReadCompletedSession.mockReturnValue(completed);

    render(<ResultsClient questions={testQuestions} historyId={undefined} />);
    expect(screen.getByRole('button', { name: /retake missed only/i })).toBeEnabled();
  });
});
