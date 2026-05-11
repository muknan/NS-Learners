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

test('blocks browser back navigation on first visit (phase 1)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // Clear all history / storage to simulate a completely fresh session.
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    // Remove any previously-pushed guard entries by replacing history.
    window.history.replaceState({}, '', '/');
  });

  await page.getByRole('link', { name: 'Flashcards' }).click();
  await expect(page).toHaveURL(/\/flashcards/);

  // Give the guard a moment to arm (effect runs after React commit).
  await page.waitForTimeout(300);
  await page.evaluate(() => window.history.back());

  const dialog = page.getByRole('dialog', { name: 'Leave flashcards?' });
  await page.waitForTimeout(150);
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/flashcards/);

  await dialog.getByRole('button', { name: 'Stay' }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/flashcards/);
});

test('blocks browser back navigation on repeat visit (phase 2)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await page.getByRole('link', { name: 'Flashcards' }).click();
  await expect(page).toHaveURL(/\/flashcards/);

  await page.waitForTimeout(300);
  await page.evaluate(() => window.history.back());

  const dialog = page.getByRole('dialog', { name: 'Leave flashcards?' });
  await page.waitForTimeout(150);
  await expect(dialog).toBeVisible();

  // Confirm leave, go back to home, then re-enter flashcards.
  await dialog.getByRole('button', { name: 'Leave' }).click();
  await page.waitForURL(/\//, { timeout: 5000 });

  await page.getByRole('link', { name: 'Flashcards' }).click();
  await expect(page).toHaveURL(/\/flashcards/);

  await page.waitForTimeout(300);
  await page.evaluate(() => window.history.back());

  const dialog2 = page.getByRole('dialog', { name: 'Leave flashcards?' });
  await page.waitForTimeout(150);
  await expect(dialog2).toBeVisible();
  await expect(page).toHaveURL(/\/flashcards/);

  await dialog2.getByRole('button', { name: 'Stay' }).click();
  await expect(dialog2).toBeHidden();
  await expect(page).toHaveURL(/\/flashcards/);
});
