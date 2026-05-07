import type { ModeId, QuestionFilter } from '@/types/exam';

export interface ExamModeConfig {
  id: ModeId;
  label: string;
  categoryLabel: string;
  description: string;
  stats: string[];
  ctaLabel: string;
  ctaVariant: 'primary' | 'secondary';
  filter: QuestionFilter;
  questionCount: number | null;
  defaultInstantFeedback: boolean;
  defaultAutoAdvance: boolean;
  timerMinutes: number | null;
  sectionBreak: boolean;
  passMark: { perSection: number; sections: number } | null;
}

export const EXAM_MODES: Record<Exclude<ModeId, 'retake'>, ExamModeConfig> = {
  'full-test': {
    id: 'full-test',
    label: 'Full Test',
    categoryLabel: 'Real simulator',
    description:
      'Closest to the real exam. Two sections of 20 questions. Pass mark: 16/20 per section.',
    stats: ['40 questions', '2 sections', '30 min per section'],
    ctaLabel: 'Start Exam',
    ctaVariant: 'primary',
    filter: 'all',
    questionCount: 40,
    defaultInstantFeedback: false,
    defaultAutoAdvance: true,
    timerMinutes: 30,
    sectionBreak: true,
    passMark: { perSection: 16, sections: 2 },
  },
  'rules-drill': {
    id: 'rules-drill',
    label: 'Rules Drill',
    categoryLabel: 'Rules only',
    description: 'Practice road rules exclusively. All rules questions from the bank, shuffled.',
    stats: ['Rules questions only', 'Untimed', 'End-of-exam feedback'],
    ctaLabel: 'Practice',
    ctaVariant: 'secondary',
    filter: 'rules',
    questionCount: null,
    defaultInstantFeedback: false,
    defaultAutoAdvance: true,
    timerMinutes: null,
    sectionBreak: false,
    passMark: null,
  },
  'signs-drill': {
    id: 'signs-drill',
    label: 'Signs Drill',
    categoryLabel: 'Signs only',
    description: 'Practice sign recognition exclusively. Every road sign question in the bank.',
    stats: ['Signs questions only', 'Untimed', 'End-of-exam feedback'],
    ctaLabel: 'Practice',
    ctaVariant: 'secondary',
    filter: 'signs',
    questionCount: null,
    defaultInstantFeedback: false,
    defaultAutoAdvance: true,
    timerMinutes: null,
    sectionBreak: false,
    passMark: null,
  },
  assisted: {
    id: 'assisted',
    label: 'Assisted Practice',
    categoryLabel: 'Learn as you go',
    description:
      'See the correct answer after each question with an explanation. Perfect for first-timers.',
    stats: ['All questions', 'Untimed', 'Instant feedback'],
    ctaLabel: 'Start Learning',
    ctaVariant: 'secondary',
    filter: 'all',
    questionCount: null,
    defaultInstantFeedback: true,
    defaultAutoAdvance: false,
    timerMinutes: null,
    sectionBreak: false,
    passMark: null,
  },
  'all-questions': {
    id: 'all-questions',
    label: 'All Questions',
    categoryLabel: 'Full bank',
    description: 'Every question in the bank. Best revision run before your real test.',
    stats: ['All questions', 'Untimed', 'Your choice'],
    ctaLabel: 'Practice',
    ctaVariant: 'secondary',
    filter: 'all',
    questionCount: null,
    defaultInstantFeedback: false,
    defaultAutoAdvance: true,
    timerMinutes: null,
    sectionBreak: false,
    passMark: null,
  },
};

export const RETAKE_MODE: ExamModeConfig = {
  ...EXAM_MODES.assisted,
  id: 'retake',
  label: 'Retake Missed',
  categoryLabel: 'Targeted review',
  description: 'Practice only the questions missed in your last session.',
  stats: ['Missed questions', 'Untimed', 'Instant feedback'],
  ctaLabel: 'Retake',
  filter: 'all',
  questionCount: null,
  defaultInstantFeedback: true,
  defaultAutoAdvance: false,
  passMark: null,
};

export function getExamMode(modeId: string | null | undefined): ExamModeConfig {
  if (modeId === 'retake') {
    return RETAKE_MODE;
  }

  const normalized = normalizeModeId(modeId);
  return EXAM_MODES[normalized];
}

export function normalizeModeId(modeId: string | null | undefined): Exclude<ModeId, 'retake'> {
  switch (modeId) {
    case 'full':
    case 'full-test':
      return 'full-test';
    case 'rules':
    case 'rules-drill':
      return 'rules-drill';
    case 'signs':
    case 'signs-drill':
      return 'signs-drill';
    case 'assisted':
      return 'assisted';
    case 'all':
    case 'all-questions':
      return 'all-questions';
    default:
      return 'full-test';
  }
}
