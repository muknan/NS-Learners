import { test, expect, type Page } from '@playwright/test';
import cards from '../../src/data/flashcards.json' with { type: 'json' };

async function fitsWidth(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => innerWidth),
  );
}

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: long flashcards and mode descriptions remain readable at narrow and zoom-sized viewports`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme });
    const longest = [...cards].sort(
      (a, b) => (b.keyPoint ?? b.summary).length - (a.keyPoint ?? a.summary).length,
    )[0]!;
    await page.goto('/');
    await page.evaluate(
      (id) => localStorage.setItem('ns-learners.flashcards.v2', JSON.stringify({ knownIds: [id] })),
      longest.id,
    );
    for (const [width, height] of [
      [320, 568],
      [375, 667],
      [768, 1024],
      [844, 390],
      [1280, 720],
      [640, 360],
      [320, 256],
    ]) {
      await page.setViewportSize({ width: width!, height: height! });
      await page.goto('/');
      for (const pill of await page.locator('.mode-card__meta').all()) {
        expect(await pill.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      }
      await page.goto('/flashcards/');
      await page.getByRole('button', { name: 'Known', exact: true }).click();
      await expect(page.getByRole('heading', { name: longest.title, exact: true })).toBeVisible();
      const details = page.getByRole('button', { name: 'Details', exact: true });
      await details.scrollIntoViewIfNeeded();
      await details.click({ trial: true });
      await fitsWidth(page);
      await details.click();
      const dialog = page.getByRole('dialog');
      expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
      await expect(details).toBeFocused();
    }
  });
}

test('last question counter and offline exam controls fit a narrow viewport', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/exam/?mode=all-questions');
  await expect(page.getByTestId('exam-shell')).toBeVisible();
  await page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem('nsLearner.currentSession')!);
    session.currentIndex = session.questionIds.length - 1;
    localStorage.setItem('ns-exam-session-all-questions', JSON.stringify(session));
  });
  await page.reload();
  await expect(page.getByTestId('exam-top-bar')).toContainText('Q 140/140');
  expect(
    await page
      .locator('.exam-top-bar__title')
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  await context.setOffline(true);
  await expect(page.locator('.offline-banner')).toBeVisible();
  const submit = page.getByRole('button', { name: 'Submit', exact: true });
  await submit.click({ trial: true });
  const box = await submit.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(568);
  await context.setOffline(false);
});

test('Review keyboard focus follows learned and restored questions', async ({ page }) => {
  await page.goto('/exam/?mode=rules-drill');
  await page.getByRole('button', { name: 'Save to Review', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved to Review' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.goto('/review/');
  await page.getByRole('button', { name: 'Mark learned' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Review', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.review-question h2')).toBeFocused();
});

test('flashcard marks queue safely across tabs and reset errors stay in the dialog', async ({
  page,
  context,
}) => {
  await page.goto('/flashcards/');
  await page.getByRole('button', { name: 'Rules', exact: true }).click();
  const other = await context.newPage();
  await other.goto('/flashcards/');
  await other.getByRole('button', { name: 'Signs', exact: true }).click();
  await page.evaluate(() => {
    const state = window as typeof window & {
      releaseKnownLock?: () => void;
      knownLockReady?: boolean;
    };
    void navigator.locks.request(
      'ns-learners.flashcards.v2',
      () =>
        new Promise<void>((resolve) => {
          state.releaseKnownLock = resolve;
          state.knownLockReady = true;
        }),
    );
  });
  await page.waitForFunction(
    () => (window as typeof window & { knownLockReady?: boolean }).knownLockReady,
  );
  await page.getByRole('button', { name: /^Mark .+ as known$/ }).click();
  await other.getByRole('button', { name: /^Mark .+ as known$/ }).click();
  await page.evaluate(() =>
    (window as typeof window & { releaseKnownLock?: () => void }).releaseKnownLock?.(),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('ns-learners.flashcards.v2')!).knownIds.length,
      ),
    )
    .toBe(2);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'ns-learners.flashcards.v2') throw new Error('Blocked');
      original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Reset flashcards', exact: true }).click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Could not reset');
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('ns-learners.flashcards.v2')!).knownIds.length,
    ),
  ).toBe(2);
  await other.close();
});
