import { test, expect } from '@playwright/test';
import bank from '../../src/data/questions.json' with { type: 'json' };

for (const failure of ['blocked', 'malformed']) {
  test(`a ${failure} Review store does not prevent opening a saved result`, async ({ page }) => {
    await page.goto('/exam/?mode=rules-drill');
    await expect(page.getByTestId('exam-shell')).toBeVisible();
    await page.evaluate((bank) => {
      const session = JSON.parse(localStorage.getItem('nsLearner.currentSession')!);
      const id = session.questionIds[0];
      const question = bank.find((q) => q.id === id)!;
      session.questionIds = [id];
      session.optionOrder = { [id]: ['a', 'b', 'c', 'd'] };
      session.answers = { [id]: question.options.find((o) => o.id !== question.correctId)!.id };
      localStorage.setItem('ns-exam-session-rules-drill', JSON.stringify(session));
    }, bank);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Submit', exact: true })).toBeVisible();
    await page.evaluate((failure) => {
      if (failure === 'malformed') {
        localStorage.setItem('nsLearner.review', 'unreadable');
        return;
      }
      const original = Storage.prototype.setItem;
      (window as typeof window & { restoreReviewWrites?: () => void }).restoreReviewWrites = () => {
        Storage.prototype.setItem = original;
      };
      Storage.prototype.setItem = function (key, value) {
        if (key === 'nsLearner.review') throw new Error('Blocked');
        original.call(this, key, value);
      };
    }, failure);
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(page).toHaveURL(/results/, { timeout: 3000 });
    const warning = page.getByText('Your result is saved, but Review could not be updated.');
    await expect(warning).toBeVisible();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
      const box = await page
        .getByRole('button', { name: 'Retry Review update', exact: true })
        .boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    await page.screenshot({
      path: test.info().outputPath('review-warning-desktop.png'),
      fullPage: true,
    });
    await page.setViewportSize({ width: 320, height: 740 });
    await page.screenshot({
      path: test.info().outputPath('review-warning-mobile.png'),
      fullPage: true,
    });
    expect(
      await page.evaluate(() => localStorage.getItem('ns-exam-session-rules-drill')),
    ).toBeNull();
    expect(
      await page.evaluate(() => JSON.parse(localStorage.getItem('ns-learner-scores')!).length),
    ).toBe(1);
    if (failure === 'malformed') {
      expect(await page.evaluate(() => localStorage.getItem('nsLearner.review'))).toBe(
        'unreadable',
      );
    } else {
      await page.evaluate(() =>
        (window as typeof window & { restoreReviewWrites?: () => void }).restoreReviewWrites?.(),
      );
      await page.getByRole('button', { name: 'Retry Review update', exact: true }).click();
      await expect(warning).toHaveCount(0);
      expect(
        await page.evaluate(() =>
          Object.values(JSON.parse(localStorage.getItem('nsLearner.review')!).items).map(
            (item) => (item as { wrongCount: number }).wrongCount,
          ),
        ),
      ).toEqual([1]);
      await expect(page.locator('#results-title')).toBeFocused();
    }
  });
}
