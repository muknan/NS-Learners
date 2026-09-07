import { expect, test } from '@playwright/test';

test('save and exit preserves an attempt for resume without creating a score', async ({ page }) => {
  await page.goto('/exam/?mode=rules-drill');
  await page.getByRole('radio').first().click();
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ns-exam-session-rules-drill')!),
  );
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await page.getByRole('button', { name: 'Save progress & exit', exact: true }).click();
  await expect(page.getByText('Progress saved. Resume your practice below.')).toBeVisible();
  await expect(page.locator('.history-item')).toHaveCount(0);
  await page
    .getByLabel('Resume Rules Drill')
    .getByRole('button', { name: 'Resume', exact: true })
    .click();
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(1);
  const after = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ns-exam-session-rules-drill')!),
  );
  expect(after.id).toBe(before.id);
  expect(after.answers).toEqual(before.answers);
});

test('cancel stays in exam; discard removes the attempt without a score or saved toast', async ({
  page,
}) => {
  await page.goto('/exam/?mode=rules-drill');
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await page.getByRole('button', { name: 'Keep practicing', exact: true }).click();
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await page.getByRole('button', { name: 'Exit without saving', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Choose a practice mode' })).toBeVisible();
  await expect(page.locator('.history-item')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('ns-exam-session-rules-drill'))).toBeNull();
  await expect(page.getByText(/Progress saved/)).toHaveCount(0);
});

test('failed save keeps the exit dialog and answers available for retry', async ({ page }) => {
  await page.goto('/exam/?mode=rules-drill');
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Full', 'QuotaExceededError');
    };
  });
  await page.getByRole('button', { name: 'Save progress & exit', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'Could not save your progress',
  );
  await page.getByRole('button', { name: 'Keep practicing', exact: true }).click();
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(1);
});

test('timed exit explains that the clock keeps running', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/exam/?mode=full-test');
  await expect(page.getByRole('radio')).toHaveCount(4);
  const deadline = await page.evaluate(
    () => JSON.parse(localStorage.getItem('ns-exam-session-full-test')!).expiresAt,
  );
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('clock keeps running');
  await page.getByRole('button', { name: 'Save progress & exit', exact: true }).click();
  await page.getByRole('button', { name: 'Resume Practice Exam', exact: true }).click();
  await expect(page.getByRole('radio')).toHaveCount(4);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('ns-exam-session-full-test')!).expiresAt,
    ),
  ).toBe(deadline);
});
