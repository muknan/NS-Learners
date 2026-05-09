import { z } from 'zod';

export const FLASHCARD_CATEGORIES = ['rules', 'signs', 'safety', 'general'] as const;

export const FlashcardCategorySchema = z.enum(FLASHCARD_CATEGORIES);

export const FlashcardSchema = z.object({
  id: z.string().regex(/^fc-\d{3,}$/),
  chapter: z.string().min(3),
  title: z.string().min(3).max(80),
  summary: z.string().min(20).max(400),
  category: FlashcardCategorySchema,
});

export const FlashcardDeckSchema = z
  .array(FlashcardSchema)
  .min(30)
  .superRefine((flashcards, context) => {
    const ids = new Set<string>();

    for (const [index, flashcard] of flashcards.entries()) {
      if (ids.has(flashcard.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate flashcard id: ${flashcard.id}`,
          path: [index, 'id'],
        });
      }
      ids.add(flashcard.id);
    }
  });

export type Flashcard = z.infer<typeof FlashcardSchema>;
export type FlashcardCategory = z.infer<typeof FlashcardCategorySchema>;
