import { expect, it } from 'vitest';
import { questions } from '@/lib/questions';
import { QuestionBankSchema, QuestionSchema } from '@/lib/questions.schema';

it('clarifies q-044 as a paired solid and broken centre line without changing the answer', () => {
  const question = questions.find((q) => q.id === 'q-044')!;
  expect(question.text).toMatch(/broken/);
  expect(question.correctId).toBe('a');
});

it('rejects whitespace-only image alternatives', () => {
  const question = questions.find((q) => q.image)!;
  expect(QuestionSchema.safeParse({ ...question, imageAlt: '   ' }).success).toBe(false);
});

it('rejects repeated identical answer text', () => {
  const question = questions[0]!;
  expect(
    QuestionSchema.safeParse({
      ...question,
      options: question.options.map((option) => ({ ...option, text: 'Same answer' })),
    }).success,
  ).toBe(false);
});

it('rejects identical question and image content under a new ID', () => {
  expect(
    QuestionBankSchema.safeParse([...questions, { ...questions[0], id: 'q-9999' }]).success,
  ).toBe(false);
});
