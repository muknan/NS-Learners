import type { QuestionTopic } from '@/lib/questions.schema';

export type ExamPhase = 'idle' | 'in-progress' | 'section-break' | 'review' | 'complete';
export type FeedbackMode = 'instant' | 'deferred';
export type QuestionCategory = 'rules' | 'signs';
export type QuestionFilter = 'all' | QuestionCategory;
export type QuestionCount = number | 'all' | null;
export type TimerMinutes = number | null;
export type ExamSource = 'full' | 'missed';
export type ModeId =
  | 'full-test'
  | 'rules-drill'
  | 'signs-drill'
  | 'assisted'
  | 'all-questions'
  | 'retake';
export type ExamMode = ModeId;

export interface AnswerOption {
  id: 'a' | 'b' | 'c' | 'd';
  text: string;
}

export interface Question {
  id: string;
  category: QuestionCategory;
  topic: QuestionTopic;
  difficulty: 'easy' | 'medium' | 'hard';
  section?: string | undefined;
  text: string;
  image?: string | undefined;
  imageAlt?: string | undefined;
  options: AnswerOption[];
  correctId: 'a' | 'b' | 'c' | 'd';
  explanation: string;
  handbookSection?: string | undefined;
  referenceSection?: string | undefined;
}

export interface OfficialMaterial {
  id: string;
  label: string;
  section: string;
  fileSize: string;
  href: string;
}

export interface ExamSettings {
  feedbackMode?: FeedbackMode;
  instantFeedback: boolean;
  questionCount: QuestionCount;
  timerMinutes: TimerMinutes;
  autoAdvance: boolean;
  autoAdvanceDurationMs: number;
}

export interface ExamSession {
  id: string;
  phase: ExamPhase;
  source: ExamSource;
  mode: ModeId;
  questionIds: string[];
  optionOrder: Record<string, AnswerOption['id'][]>;
  currentIndex: number;
  answers: Record<string, AnswerOption['id']>;
  flaggedIds: string[];
  instantFeedback: boolean;
  autoAdvance: boolean;
  previousAutoAdvance: boolean;
  autoAdvanceDurationMs: number;
  autoAdvancedIds: string[];
  shouldAutoAdvance: boolean;
  settings: ExamSettings;
  startedAt: number;
  expiresAt: number | null;
  completedAt: number | null;
}

export interface QuestionResult {
  question: Question;
  selectedId: string | null;
  selectedText: string | null;
  correctText: string;
  isCorrect: boolean;
}

export interface SectionBreakdown {
  section: string;
  correct: number;
  total: number;
  percentage: number;
}

export interface CategoryBreakdown {
  category: QuestionCategory;
  correct: number;
  total: number;
  percentage: number;
}

export interface TopicBreakdown {
  topic: QuestionTopic;
  correct: number;
  total: number;
  percentage: number;
}

export interface ScoreSummary {
  correct: number;
  total: number;
  percentage: number;
  passed: boolean | null;
  unanswered: number;
  bySection: SectionBreakdown[];
  byCategory: CategoryBreakdown[];
  byTopic: TopicBreakdown[];
}

export interface HistoryEntry extends ScoreSummary {
  id: string;
  completedAt: number;
  source: ExamSource;
  mode: ModeId;
}

export interface ScoreRecord {
  id: string;
  modeId: ModeId;
  score: number;
  total: number;
  percent: number;
  passed: boolean | null;
  section1?: { score: number; total: number } | undefined;
  section2?: { score: number; total: number } | undefined;
  topicBreakdown: Record<string, { correct: number; total: number }>;
  completedAt: number;
  durationMs: number;
}
