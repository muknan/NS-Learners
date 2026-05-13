import type {
  AnswerOption,
  ExamMode,
  ExamSession,
  ExamSettings,
  Question,
  QuestionCount,
  QuestionFilter,
  TimerMinutes,
} from '@/types/exam';
import { getExamMode } from '@/lib/modes';
import { shuffle } from '@/lib/shuffle';

export const DEFAULT_SETTINGS: ExamSettings = {
  instantFeedback: false,
  questionCount: 40,
  timerMinutes: 60,
  autoAdvance: true,
  autoAdvanceDurationMs: 3000,
};

const timerOptions = new Set<TimerMinutes>([0, 30, 45, 60, null]);
const questionCountOptions = new Set<QuestionCount>([20, 40, 'all', null]);

export function normalizeSettings(value: unknown): ExamSettings {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_SETTINGS };
  }

  const candidate = value as Partial<ExamSettings>;

  return {
    instantFeedback:
      typeof candidate.instantFeedback === 'boolean' ? candidate.instantFeedback : false,
    questionCount: questionCountOptions.has(candidate.questionCount as QuestionCount)
      ? (candidate.questionCount as QuestionCount)
      : DEFAULT_SETTINGS.questionCount,
    timerMinutes: timerOptions.has(candidate.timerMinutes as TimerMinutes)
      ? (candidate.timerMinutes as TimerMinutes)
      : DEFAULT_SETTINGS.timerMinutes,
    autoAdvance: candidate.autoAdvance === true,
    autoAdvanceDurationMs:
      typeof candidate.autoAdvanceDurationMs === 'number'
        ? candidate.autoAdvanceDurationMs
        : DEFAULT_SETTINGS.autoAdvanceDurationMs,
  };
}

export function createExamSession({
  questions,
  settings,
  source = 'full',
  questionIds,
  mode = 'full-test',
  autoAdvanceDurationMs = 3000,
}: {
  questions: readonly Question[];
  settings?: ExamSettings;
  source?: ExamSession['source'];
  questionIds?: readonly string[];
  mode?: ExamMode;
  autoAdvanceDurationMs?: number;
}): ExamSession {
  const modeConfig = getExamMode(mode);
  const questionCount = questionIds?.length ? 'all' : modeConfig.questionCount;
  const selectedQuestions = selectQuestions(
    questions,
    questionCount,
    questionIds,
    modeConfig.filter,
  );
  const now = Date.now();
  const instantFeedback = modeConfig.defaultInstantFeedback;
  const sessionSettings: ExamSettings = {
    ...normalizeSettings(settings),
    instantFeedback: modeConfig.defaultInstantFeedback,
    questionCount,
    timerMinutes: modeConfig.timerMinutes,
    autoAdvance: modeConfig.defaultAutoAdvance,
    autoAdvanceDurationMs,
  };

  return {
    id: globalThis.crypto?.randomUUID?.() ?? String(now),
    phase: 'in-progress',
    source,
    mode: modeConfig.id,
    questionIds: selectedQuestions.map((question) => question.id),
    optionOrder: Object.fromEntries(
      selectedQuestions.map((question) => [
        question.id,
        shuffle(question.options.map((option) => option.id)),
      ]),
    ),
    currentIndex: 0,
    answers: {},
    flaggedIds: [],
    instantFeedback,
    autoAdvance: modeConfig.defaultAutoAdvance,
    previousAutoAdvance: modeConfig.defaultAutoAdvance,
    autoAdvanceDurationMs,
    autoAdvancedIds: [],
    shouldAutoAdvance: false,
    settings: sessionSettings,
    startedAt: now,
    expiresAt: sessionSettings.timerMinutes ? now + sessionSettings.timerMinutes * 60 * 1000 : null,
    completedAt: null,
  };
}

export function completeSession(session: ExamSession, now = Date.now()): ExamSession {
  return {
    ...session,
    phase: 'complete',
    completedAt: now,
  };
}

export function getOrderedOptions(question: Question, session: ExamSession): Question['options'] {
  const orderedIds =
    session.optionOrder[question.id] ?? question.options.map((option) => option.id);
  const optionMap = new Map<AnswerOption['id'], Question['options'][number]>(
    question.options.map((option) => [option.id, option]),
  );

  return orderedIds.flatMap((optionId) => {
    const option = optionMap.get(optionId);
    return option ? [option] : [];
  });
}

export function getCurrentQuestion(
  session: ExamSession,
  questionsById: Map<string, Question>,
): Question {
  const questionId = session.questionIds[session.currentIndex];
  if (questionId === undefined) {
    throw new Error('Session has no current question.');
  }
  const question = questionsById.get(questionId);

  if (!question) {
    throw new Error(`Session references unknown question id: ${questionId}`);
  }

  return question;
}

export function getUnansweredQuestionNumbers(session: ExamSession): number[] {
  return session.questionIds.flatMap((questionId, index) =>
    session.answers[questionId] ? [] : [index + 1],
  );
}

function selectQuestions(
  questions: readonly Question[],
  count: QuestionCount,
  forcedQuestionIds?: readonly string[],
  filter: QuestionFilter = 'all',
): Question[] {
  if (forcedQuestionIds?.length) {
    const forced = new Set(forcedQuestionIds);
    const selected = questions.filter((question) => forced.has(question.id));
    return shuffle(selected).slice(0, count === 'all' || count === null ? selected.length : count);
  }

  if (count === 'all' || count === null) {
    return shuffle(questions);
  }

  if (count === 40 && filter === 'all') {
    const rules = shuffle(questions.filter((question) => question.category === 'rules')).slice(
      0,
      20,
    );
    const signs = shuffle(questions.filter((question) => question.category === 'signs')).slice(
      0,
      20,
    );

    if (rules.length === 20 && signs.length === 20) {
      return [...rules, ...signs];
    }
  }

  const byCategory = new Map<string, Question[]>();
  for (const question of questions) {
    const current = byCategory.get(question.category) ?? [];
    current.push(question);
    byCategory.set(question.category, current);
  }
  const categories = [...byCategory.keys()];
  const perCategory = Math.floor(count / Math.max(categories.length, 1));
  const remainder = count % Math.max(categories.length, 1);

  const selected = categories.flatMap((category, index) => {
    const target = perCategory + (index < remainder ? 1 : 0);
    return shuffle(byCategory.get(category) ?? []).slice(0, target);
  });

  if (selected.length >= count) {
    // Keep balanced 40-question full tests split into 20 rules and 20 signs.
    return selected.slice(0, count);
  }

  const selectedIds = new Set(selected.map((question) => question.id));
  const fill = shuffle(questions.filter((question) => !selectedIds.has(question.id))).slice(
    0,
    count - selected.length,
  );

  return [...selected, ...fill];
}
