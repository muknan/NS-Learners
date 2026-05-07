import type {
  ExamSession,
  HistoryEntry,
  Question,
  QuestionResult,
  ScoreSummary,
  QuestionCategory,
  SectionBreakdown,
  TopicBreakdown,
} from '@/types/exam';
import { getExamMode } from '@/lib/modes';
import { getTopicLabel } from '@/lib/questions';

export function scoreSession(
  session: ExamSession,
  questionsById: Map<string, Question>,
): ScoreSummary {
  const results = getQuestionResults(session, questionsById);
  const correct = results.filter((result) => result.isCorrect).length;
  const total = results.length;
  const unanswered = results.filter((result) => !result.selectedId).length;
  const percentage = total ? Math.round((correct / total) * 100) : 0;
  const bySection = getSectionBreakdown(results);
  const mode = getExamMode(session.mode);
  const passMark = mode.passMark;
  const passed =
    passMark === null
      ? null
      : bySection
          .slice(0, passMark.sections)
          .every((section) => section.correct >= passMark.perSection);

  return {
    correct,
    total,
    percentage,
    passed,
    unanswered,
    bySection,
    byCategory: getCategoryBreakdown(results),
    byTopic: getTopicBreakdown(results),
  };
}

export function getQuestionResults(
  session: ExamSession,
  questionsById: Map<string, Question>,
): QuestionResult[] {
  return session.questionIds.map((questionId) => {
    const question = getQuestionOrThrow(questionsById, questionId);
    const selectedId = session.answers[question.id] ?? null;
    const selectedText = question.options.find((option) => option.id === selectedId)?.text ?? null;
    const correctText =
      question.options.find((option) => option.id === question.correctId)?.text ?? 'Unknown';

    return {
      question,
      selectedId,
      selectedText,
      correctText,
      isCorrect: selectedId === question.correctId,
    };
  });
}

export function getMissedQuestionIds(
  session: ExamSession,
  questionsById: Map<string, Question>,
): string[] {
  return getQuestionResults(session, questionsById)
    .filter((result) => !result.isCorrect)
    .map((result) => result.question.id);
}

export function toHistoryEntry(
  session: ExamSession,
  questionsById: Map<string, Question>,
): HistoryEntry {
  const summary = scoreSession(session, questionsById);

  return {
    ...summary,
    id: session.id,
    completedAt: session.completedAt ?? Date.now(),
    source: session.source,
    mode: session.mode,
  };
}

export function buildShareSummary(
  session: ExamSession,
  questionsById: Map<string, Question>,
): string {
  const summary = scoreSession(session, questionsById);
  const label = getExamMode(session.mode).label;
  const rules = summary.byCategory.find((item) => item.category === 'rules');
  const signs = summary.byCategory.find((item) => item.category === 'signs');
  const completedAt = new Intl.DateTimeFormat('en-CA', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(session.completedAt ?? Date.now()));

  return [
    'NS Learner Test Practice',
    `${label} - ${summary.correct}/${summary.total} (${summary.percentage}%)${
      summary.passed === null ? '' : ` - ${summary.passed ? 'Pass' : 'Fail'}`
    }`,
    `Rules: ${rules?.correct ?? 0}/${rules?.total ?? 0} - Signs: ${signs?.correct ?? 0}/${
      signs?.total ?? 0
    }`,
    ...summary.byTopic
      .slice(0, 3)
      .map((topic) => `${getTopicLabel(topic.topic)}: ${topic.percentage}%`),
    `Completed: ${completedAt}`,
    '',
    'Practice free at: https://nova-scotia-learners-test.vercel.app',
  ].join('\n');
}

export function calcScore(results: readonly QuestionResult[]): { correct: number; total: number } {
  return {
    correct: results.filter((result) => result.isCorrect).length,
    total: results.length,
  };
}

function getSectionBreakdown(results: readonly QuestionResult[]): SectionBreakdown[] {
  const sectionSize = results.length === 40 ? 20 : results.length;
  const sections = results.length === 40 ? ['Section 1', 'Section 2'] : ['Practice'];

  return sections.map((section, index) => {
    const chunk = results.slice(index * sectionSize, (index + 1) * sectionSize);
    const correct = chunk.filter((result) => result.isCorrect).length;
    return {
      section,
      correct,
      total: chunk.length,
      percentage: chunk.length ? Math.round((correct / chunk.length) * 100) : 0,
    };
  });
}

function getCategoryBreakdown(results: readonly QuestionResult[]) {
  const categories = new Map<QuestionCategory, { correct: number; total: number }>();

  for (const result of results) {
    const current = categories.get(result.question.category) ?? { correct: 0, total: 0 };
    current.total += 1;
    current.correct += result.isCorrect ? 1 : 0;
    categories.set(result.question.category, current);
  }

  return [...categories.entries()].map(([category, item]) => ({
    category,
    correct: item.correct,
    total: item.total,
    percentage: item.total ? Math.round((item.correct / item.total) * 100) : 0,
  }));
}

export function calcTopicBreakdown(
  results: readonly QuestionResult[],
): Record<string, { correct: number; total: number }> {
  const breakdown: Record<string, { correct: number; total: number }> = {};

  for (const result of results) {
    const current = breakdown[result.question.topic] ?? { correct: 0, total: 0 };
    current.total += 1;
    current.correct += result.isCorrect ? 1 : 0;
    breakdown[result.question.topic] = current;
  }

  return breakdown;
}

export function isPassing(
  session: ExamSession,
  questionsById: Map<string, Question>,
): boolean | null {
  return scoreSession(session, questionsById).passed;
}

function getTopicBreakdown(results: readonly QuestionResult[]): TopicBreakdown[] {
  const breakdown = calcTopicBreakdown(results);

  return Object.entries(breakdown).map(([topic, item]) => ({
    topic: topic as TopicBreakdown['topic'],
    correct: item.correct,
    total: item.total,
    percentage: item.total ? Math.round((item.correct / item.total) * 100) : 0,
  }));
}

function getQuestionOrThrow(questionsById: Map<string, Question>, questionId: string): Question {
  const question = questionsById.get(questionId);

  if (!question) {
    throw new Error(`Unable to score missing question id: ${questionId}`);
  }

  return question;
}
