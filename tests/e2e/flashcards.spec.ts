import { expect, test } from '@playwright/test';

test('flashcards are reachable and support button and keyboard navigation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Flashcards' }).click();

  await expect(page).toHaveURL(/\/flashcards/);
  await expect(page.getByText(/Card 1 of \d+/)).toBeVisible();

  const firstTitle = await page.getByRole('heading', { level: 1 }).textContent();

  await page
    .locator('.flashcard-actions')
    .getByRole('button', { name: /^next flashcard$/i })
    .click();
  await expect(page.getByText(/Card 2 of \d+/)).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(firstTitle ?? '');

  await page.keyboard.press('ArrowLeft');
  await expect(page.getByText(/Card 1 of \d+/)).toBeVisible();

  await page.keyboard.press('s');
  await expect(page.getByText(/Card 1 of \d+/)).toBeVisible();
});
