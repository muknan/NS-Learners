import { test, expect } from '@playwright/test';
import bank from '../../src/data/questions.json' with { type: 'json' };

test('save a test question to Review, reveal its answer, learn it and undo', async ({ page }) => {
  await page.goto('/exam/?mode=rules-drill');
  await page.getByRole('button', { name: 'Save to Review', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved to Review' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const text = await page.getByTestId('exam-question').textContent();
  await page.goto('/review/');
  const card = page.locator('.review-question');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText(text!);
  await expect(card).toContainText('Saved by you');
  await expect(card.locator('details')).not.toHaveAttribute('open');
  await card.locator('summary').click();
  await expect(card.locator('details')).toHaveAttribute('open', '');
  await page.getByRole('button', { name: 'Mark learned' }).click();
  await expect(card).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(card).toHaveCount(1);
  await page.reload();
  await expect(card).toHaveCount(1);
});

test('completed mistakes migrate once, retain intentional saves, and never count unanswered', async ({
  page,
}) => {
  await page.goto('/exam/?mode=rules-drill');
  await expect(page.getByTestId('exam-shell')).toBeVisible();
  await page.evaluate((bank) => {
    const session = JSON.parse(localStorage.getItem('nsLearner.currentSession')!);
    const question = bank.find((q) => q.id === session.questionIds[0])!;
    session.answers[question.id] = question.options.find((o) => o.id !== question.correctId)!.id;
    session.phase = 'complete';
    session.completedAt = Date.now();
    localStorage.setItem(
      'ns-learner-scores',
      JSON.stringify([
        {
          id: session.id,
          completedAt: session.completedAt,
          correct: 0,
          total: session.questionIds.length,
          percentage: 0,
          passed: null,
          source: session.source,
          mode: session.mode,
          session,
        },
      ]),
    );
  }, bank);
  await page.goto('/review/');
  await expect(page.locator('.review-question')).toHaveCount(1);
  await expect(page.locator('.review-question')).toContainText('1 mistake');
  await page.reload();
  await expect(page.locator('.review-question')).toContainText('1 mistake');
  await page.getByRole('button', { name: 'Mark learned' }).click();
  await expect(page.locator('.review-question')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.review-question')).toHaveCount(0);
});

test('submission records wrong answers in Review without duplicate counts', async ({ page }) => {
  await page.goto('/exam/?mode=rules-drill');
  await expect(page.getByTestId('exam-shell')).toBeVisible();
  await page.evaluate((bank) => {
    const session = JSON.parse(localStorage.getItem('nsLearner.currentSession')!);
    session.questionIds = session.questionIds.slice(0, 1);
    session.optionOrder = { [session.questionIds[0]]: ['a', 'b', 'c', 'd'] };
    const question = bank.find((q) => q.id === session.questionIds[0])!;
    session.answers = {
      [question.id]: question.options.find((o) => o.id !== question.correctId)!.id,
    };
    localStorage.setItem('ns-exam-session-rules-drill', JSON.stringify(session));
  }, bank);
  await page.reload();
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page).toHaveURL(/results/);
  await page.goto('/review/');
  await expect(page.locator('.review-question')).toHaveCount(1);
  await expect(page.locator('.review-question')).toContainText('1 mistake');
  await page.reload();
  await expect(page.locator('.review-question')).toContainText('1 mistake');
});

test('Review filters combine with topic selection and prioritize repeated mistakes', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate((bank) => {
    const rules = bank.filter((q) => q.category === 'rules');
    const sign = bank.find((q) => q.category === 'signs')!;
    localStorage.setItem(
      'nsLearner.review',
      JSON.stringify({
        countedAttempts: [],
        items: {
          [rules[0]!.id]: { wrongCount: 1, saved: false, updatedAt: 1 },
          [rules[1]!.id]: { wrongCount: 2, saved: false, updatedAt: 2 },
          [sign.id]: { wrongCount: 4, saved: true, updatedAt: 3 },
        },
      }),
    );
  }, bank);
  await page.goto('/review/');
  await expect(page.locator('.review-question').first()).toContainText('4 mistakes');
  await expect(page.locator('.review-question').first()).toContainText('Saved by you');
  await page.getByRole('button', { name: 'Saved (1)', exact: true }).click();
  await expect(page.locator('.review-question')).toHaveCount(1);
  await page.getByLabel('Topic', { exact: true }).selectOption('rules');
  await expect(
    page.getByRole('heading', { name: 'No questions match these filters' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Mistakes (3)', exact: true }).click();
  await expect(page.locator('.review-question')).toHaveCount(2);
});

test('failed manual save stays unsaved and can be retried', async ({ page }) => {
  await page.goto('/exam/?mode=rules-drill');
  const save = page.getByRole('button', { name: 'Save to Review', exact: true });
  await expect(save).toBeEnabled();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'nsLearner.review') throw new Error('Full');
      original.call(this, key, value);
    };
  });
  await save.click();
  await expect(page.locator('.review-save-control [role="alert"]')).toContainText(
    'Could not save this change',
  );
  await page.getByRole('button', { name: 'Back to question', exact: true }).click();
  await expect(save).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await save.click();
  await expect(page.getByRole('button', { name: 'Saved to Review', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('double-clicking a queued save does not remove the bookmark or show a false error', async ({
  page,
}) => {
  await page.goto('/exam/?mode=rules-drill');
  const save = page.getByRole('button', { name: 'Save to Review', exact: true });
  await expect(save).toBeEnabled();
  await page.evaluate(() => {
    const state = window as typeof window & { releaseReviewLock?: () => void };
    void navigator.locks.request(
      'nsLearner.review',
      () =>
        new Promise<void>((resolve) => {
          state.releaseReviewLock = resolve;
        }),
    );
  });
  await page.waitForFunction(() =>
    Boolean((window as typeof window & { releaseReviewLock?: () => void }).releaseReviewLock),
  );
  await save.dblclick();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.evaluate(() =>
    (window as typeof window & { releaseReviewLock?: () => void }).releaseReviewLock?.(),
  );
  await expect(page.getByRole('button', { name: 'Saved to Review', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`Review and Resume stay within the ${width}px header`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/exam/?mode=rules-drill');
    await expect(page.getByTestId('exam-shell')).toBeVisible();
    await page.getByRole('button', { name: 'Save to Review', exact: true }).click();
    await page.goto('/review/');
    const resume = page.getByRole('button', { name: 'Resume', exact: true });
    await expect(resume).toBeVisible();
    const review = page.getByRole('link', { name: 'Review', exact: true });
    const bounds = await resume.boundingBox();
    const reviewBounds = await review.boundingBox();
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(Math.abs(bounds!.y - reviewBounds!.y)).toBeLessThan(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
}
