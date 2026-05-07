import { expect, test } from '@playwright/test';

test('land, start exam, answer all questions, and see results', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.setItem(
      'nsLearner.settings',
      JSON.stringify({
        feedbackMode: 'deferred',
        instantFeedback: false,
        questionCount: 20,
        timerMinutes: 0,
        autoAdvance: false,
        autoAdvanceDurationMs: 3000,
      }),
    );
  });

  await page.getByRole('button', { name: /start practice exam/i }).click();
  await expect(page.getByTestId('answer-option').first()).toBeVisible();

  for (let index = 0; index < 45; index += 1) {
    await page.getByTestId('answer-option').first().click();

    const submit = page.getByRole('button', { name: /^submit$/i });
    if (await submit.isVisible()) {
      await submit.click();
      break;
    }

    await page.getByRole('button', { name: /^next$/i }).click();

    const continueSection = page.getByRole('button', { name: /continue to section 2/i });
    if (await continueSection.isVisible()) {
      await continueSection.click();
    }
  }

  await expect(page).toHaveURL(/\/results/);
  await expect(page.getByText(/correct overall/i)).toBeVisible();
});

test('home renders at required responsive widths', async ({ page }) => {
  for (const viewport of [
    { width: 375, height: 780 },
    { width: 768, height: 900 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Practice the Nova Scotia Class 7 learner test.' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /start practice exam/i })).toBeVisible();
  }
});
