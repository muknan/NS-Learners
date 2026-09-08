import { test, expect } from '@playwright/test';

test('touch gestures inside a dialog cannot navigate the underlying exam', async ({ page }) => {
  await page.goto('/exam/?mode=rules-drill');
  await expect(page.getByTestId('exam-shell')).toBeVisible();
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  const text = page.getByRole('dialog', { name: 'Exit exam?' }).locator('.submit-warning p');
  await text.dispatchEvent('pointerdown', { pointerType: 'touch', clientX: 260, clientY: 150 });
  await text.dispatchEvent('pointerup', { pointerType: 'touch', clientX: 60, clientY: 150 });
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('nsLearner.currentSession')!).currentIndex,
    ),
  ).toBe(0);
  await page.getByRole('button', { name: 'Keep practicing', exact: true }).click();
  const question = page.getByTestId('exam-question');
  await question.dispatchEvent('pointerdown', { pointerType: 'touch', clientX: 260, clientY: 150 });
  await question.dispatchEvent('pointerup', { pointerType: 'touch', clientX: 60, clientY: 150 });
  await expect(page.getByTestId('exam-top-bar')).toContainText('Q 2/');
});
