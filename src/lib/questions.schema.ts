import { z } from 'zod';

export const QUESTION_TOPICS = [
  'speed-limits',
  'right-of-way',
  'traffic-signals',
  'road-signs',
  'pavement-markings',
  'parking',
  'passing',
  'following-distance',
  'highway-driving',
  'intersections',
  'pedestrians-cyclists',
  'emergency-vehicles',
  'alcohol-drugs',
  'licence-conditions',
  'vehicle-safety',
  'weather-conditions',
  'night-driving',
  'sharing-road',
] as const;

export const QuestionTopicSchema = z.enum(QUESTION_TOPICS);

export const AnswerOptionSchema = z.object({
  id: z.enum(['a', 'b', 'c', 'd']),
  text: z.string().min(1).max(200),
});

export const QuestionSchema = z
  .object({
    id: z.string().regex(/^q-\d{3,}$/),
    category: z.enum(['rules', 'signs']),
    topic: QuestionTopicSchema,
    difficulty: z.enum(['easy', 'medium', 'hard']),
    text: z.string().min(10).max(300),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    options: z.array(AnswerOptionSchema).length(4),
    correctId: z.enum(['a', 'b', 'c', 'd']),
    explanation: z.string().min(20).max(500),
    handbookSection: z.string().optional(),
  })
  .refine((question) => !question.image || question.imageAlt, {
    message: 'imageAlt is required when image is present',
  })
  .superRefine((question, context) => {
    const ids = new Set(question.options.map((option) => option.id));

    if (ids.size !== question.options.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'options must use unique ids',
        path: ['options'],
      });
    }

    if (!ids.has(question.correctId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'correctId must match one option id',
        path: ['correctId'],
      });
    }
  });

export const QuestionBankSchema = z
  .array(QuestionSchema)
  .min(80)
  .superRefine((questions, context) => {
    const ids = new Set<string>();

    for (const [index, question] of questions.entries()) {
      if (ids.has(question.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate question id: ${question.id}`,
          path: [index, 'id'],
        });
      }
      ids.add(question.id);
    }
  });

export type QuestionTopic = z.infer<typeof QuestionTopicSchema>;
