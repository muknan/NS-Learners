import { expect, test, type Locator, type Page } from '@playwright/test';

async function activate(control: Locator, touch: boolean) {
  if (touch) await control.tap();
  else await control.click();
}

async function start(page: Page, touch: boolean) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/exam/?mode=rules-drill');
  await expect(page.getByTestId('exam-shell')).toBeVisible();
  await activate(page.getByRole('button', { name: 'Exam settings', exact: true }), touch);
  await expect(page.getByRole('dialog', { name: 'Exam settings', exact: true })).toBeVisible();
}

for (const target of ['track', 'label']) {
  test(`settings ${target} activation changes each switch once and persists`, async ({
    page,
    hasTouch,
  }) => {
    await start(page, hasTouch);
    for (const name of ['instant-feedback', 'auto-advance']) {
      const control = page.locator(`#${name}-toggle-compact`);
      for (let i = 0; i < 3; i++) {
        const before = await control.getAttribute('aria-checked');
        const hit =
          target === 'track' ? control : control.locator('..').locator('.toggle-switch__label');
        await activate(hit, hasTouch);
        await expect(control).toHaveAttribute('aria-checked', String(before !== 'true'));
        await expect(
          page.getByRole('dialog', { name: 'Exam settings', exact: true }),
        ).toBeVisible();
      }
    }
    const beforeReload = await page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem('nsLearner.currentSession')!);
      return [session.instantFeedback, session.autoAdvance];
    });
    await page.reload();
    await activate(page.getByRole('button', { name: 'Exam settings', exact: true }), hasTouch);
    await expect(page.locator('#instant-feedback-toggle-compact')).toHaveAttribute(
      'aria-checked',
      String(beforeReload[0]),
    );
    await expect(page.locator('#auto-advance-toggle-compact')).toHaveAttribute(
      'aria-checked',
      String(beforeReload[1]),
    );
  });
}

test('null-target blur keeps controls mounted; keyboard exit and explicit dismissal still work', async ({
  page,
  hasTouch,
}) => {
  await start(page, hasTouch);
  const dialog = page.getByRole('dialog', { name: 'Exam settings', exact: true });
  const first = dialog.getByRole('switch').first();
  await first.focus();
  await first.evaluate((el) => (el as HTMLElement).blur());
  await expect(dialog).toBeVisible();
  await first.focus();
  const initial = await first.getAttribute('aria-checked');
  await page.keyboard.press('Space');
  await expect(first).toHaveAttribute('aria-checked', String(initial !== 'true'));
  await page.keyboard.press('Enter');
  await expect(first).toHaveAttribute('aria-checked', initial!);
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('switch').last()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close exam settings' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog).toBeHidden();
  const opener = page.getByRole('button', { name: 'Exam settings', exact: true });
  await activate(opener, hasTouch);
  await page.keyboard.press('Shift+Tab');
  await expect(opener).toBeFocused();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog).toBeHidden();
  await activate(opener, hasTouch);
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  await expect(dialog).toBeHidden();
  await activate(opener, hasTouch);
  await activate(page.getByRole('button', { name: 'Close exam settings' }), hasTouch);
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test('outside action taps dismiss settings and activate Flag and Next once', async ({
  page,
  hasTouch,
}) => {
  await start(page, hasTouch);
  await activate(page.getByRole('button', { name: 'Flag', exact: true }), hasTouch);
  await expect(page.getByRole('dialog', { name: 'Exam settings', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Flagged', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await activate(page.getByRole('button', { name: 'Exam settings', exact: true }), hasTouch);
  await activate(page.getByRole('button', { name: 'Next', exact: true }), hasTouch);
  await expect(page.getByTestId('exam-top-bar')).toContainText('Q 2/');
  await expect(page.getByRole('dialog', { name: 'Exam settings', exact: true })).toBeHidden();
});

test('Dark mode label and track both work inside the native settings dialog', async ({
  page,
  hasTouch,
}) => {
  await page.goto('/');
  await activate(page.getByRole('button', { name: 'Settings', exact: true }), hasTouch);
  const control = page.getByRole('switch', { name: /^Dark mode/ });
  const initial = await control.getAttribute('aria-checked');
  await activate(page.getByText('Dark mode', { exact: true }), hasTouch);
  await expect(control).toHaveAttribute('aria-checked', String(initial !== 'true'));
  await activate(control, hasTouch);
  await expect(control).toHaveAttribute('aria-checked', initial!);
  await expect(page.getByRole('dialog', { name: 'Practice settings' })).toBeVisible();
});

test('settings cancels pending auto-advance and feedback changes still affect the exam', async ({
  page,
  hasTouch,
}) => {
  await page.clock.install();
  await start(page, hasTouch);
  await activate(page.getByRole('button', { name: 'Close exam settings' }), hasTouch);
  await activate(page.getByRole('radio').first(), hasTouch);
  await activate(page.getByRole('button', { name: 'Exam settings', exact: true }), hasTouch);
  await page.clock.runFor(4000);
  await expect(page.getByTestId('exam-top-bar')).toContainText('Q 1/');
  await activate(page.locator('#instant-feedback-toggle-compact'), hasTouch);
  await expect(page.locator('#auto-advance-toggle-compact')).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await activate(page.getByRole('button', { name: 'Close exam settings' }), hasTouch);
  await activate(page.getByRole('button', { name: 'Explanation', exact: true }), hasTouch);
  await expect(page.getByRole('dialog', { name: 'Explanation', exact: true })).toBeVisible();
  await activate(page.getByRole('button', { name: 'Close dialog', exact: true }), hasTouch);
  await activate(page.getByRole('button', { name: 'Exam settings', exact: true }), hasTouch);
  await activate(page.locator('#instant-feedback-toggle-compact'), hasTouch);
  await expect(page.locator('#auto-advance-toggle-compact')).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await activate(page.getByRole('button', { name: 'Close exam settings' }), hasTouch);
  await activate(page.getByRole('button', { name: 'Next', exact: true }), hasTouch);
  await activate(page.getByRole('radio').first(), hasTouch);
  await page.clock.runFor(4000);
  await expect(page.getByTestId('exam-top-bar')).toContainText('Q 3/');
});

for (const theme of ['light', 'dark']) {
  test(`${theme} labels and switches fit and activate across layout changes`, async ({
    page,
    hasTouch,
  }) => {
    await start(page, hasTouch);
    await activate(page.getByRole('button', { name: 'Close exam settings' }), hasTouch);
    await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme);
    for (const [width, height] of [
      [320, 740],
      [480, 800],
      [481, 800],
      [768, 900],
      [1440, 900],
      [740, 320],
    ]) {
      await page.setViewportSize({ width: width!, height: height! });
      const opener = page.getByRole('button', { name: 'Exam settings', exact: true });
      if (await opener.isVisible()) await activate(opener, hasTouch);
      const visibleSwitches = page.getByRole('switch');
      await expect(visibleSwitches).toHaveCount(2);
      for (const control of await visibleSwitches.all()) {
        const label = control.locator('..').locator('.toggle-switch__label');
        const before = await control.getAttribute('aria-checked');
        await activate(label, hasTouch);
        await expect(control).toHaveAttribute('aria-checked', String(before !== 'true'));
        await activate(control, hasTouch);
        await expect(control).toHaveAttribute('aria-checked', before!);
        const box = (await control.locator('..').boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width!);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width!,
      );
      if (await opener.isVisible())
        await activate(page.getByRole('button', { name: 'Close exam settings' }), hasTouch);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await activate(page.getByRole('button', { name: 'Exam settings', exact: true }), hasTouch);
    await page.screenshot({
      path: test.info().outputPath(`settings-${theme}.png`),
      fullPage: true,
    });
  });
}

test('labels and dialogs cannot start exam swipes; ordinary question swipes still work', async ({
  page,
  hasTouch,
}) => {
  await start(page, hasTouch);
  const swipe = async (target: Locator) => {
    await target.dispatchEvent('pointerdown', { pointerType: 'touch', clientX: 280, clientY: 150 });
    await target.dispatchEvent('pointerup', { pointerType: 'touch', clientX: 80, clientY: 150 });
  };
  await swipe(page.locator('.exam-action-popover .exam-action-bar__hint'));
  await expect(page.getByTestId('exam-top-bar')).toContainText('Q 1/');
  await activate(page.getByRole('button', { name: 'Close exam settings' }), hasTouch);
  await page.setViewportSize({ width: 1024, height: 900 });
  await swipe(page.locator('.exam-action-bar__inline-settings .toggle-switch__label').first());
  await expect(page.getByTestId('exam-top-bar')).toContainText('Q 1/');
  await swipe(page.getByTestId('exam-question'));
  await expect(page.getByTestId('exam-top-bar')).toContainText('Q 2/');
});

test('Review save, reveal, learn and undo respond to taps', async ({ page, hasTouch }) => {
  await page.goto('/exam/?mode=rules-drill');
  await activate(page.getByRole('button', { name: 'Save to Review', exact: true }), hasTouch);
  await expect(page.getByRole('button', { name: 'Saved to Review', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.goto('/review/');
  const card = page.locator('.review-question');
  await expect(card).toHaveCount(1);
  await activate(card.locator('summary'), hasTouch);
  await expect(card.locator('details')).toHaveAttribute('open', '');
  await activate(page.getByRole('button', { name: 'Mark learned' }), hasTouch);
  await expect(card).toHaveCount(0);
  await activate(page.getByRole('button', { name: 'Undo', exact: true }), hasTouch);
  await expect(card).toHaveCount(1);
});

test('save, resume and discard remain distinct through native dialogs', async ({
  page,
  hasTouch,
}) => {
  await start(page, hasTouch);
  await activate(page.getByRole('button', { name: 'Close exam settings' }), hasTouch);
  await activate(page.getByRole('button', { name: 'Exit', exact: true }), hasTouch);
  await activate(page.getByRole('button', { name: 'Save progress & exit', exact: true }), hasTouch);
  await expect(page).toHaveURL(/\/$/);
  await activate(
    page.getByLabel('Resume Rules Drill').getByRole('button', { name: 'Resume', exact: true }),
    hasTouch,
  );
  await expect(page.getByTestId('exam-shell')).toBeVisible();
  await activate(page.getByRole('button', { name: 'Exit', exact: true }), hasTouch);
  await activate(page.getByRole('button', { name: 'Exit without saving', exact: true }), hasTouch);
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => localStorage.getItem('ns-exam-session-rules-drill'))).toBeNull();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('ns-learner-scores') || '[]')),
  ).toEqual([]);
});

test('navigator selection and Submit work while dismissing settings', async ({
  page,
  hasTouch,
}) => {
  await start(page, hasTouch);
  await activate(
    page.getByRole('button', { name: 'Open question navigator', exact: true }),
    hasTouch,
  );
  await expect(page.getByRole('dialog', { name: 'Exam settings', exact: true })).toBeHidden();
  await activate(
    page.getByRole('button', { name: 'Question 60, unanswered', exact: true }),
    hasTouch,
  );
  await expect(page.getByTestId('exam-top-bar')).toContainText('Q 60/');
  await activate(page.getByRole('button', { name: 'Exam settings', exact: true }), hasTouch);
  await activate(page.getByRole('button', { name: 'Submit', exact: true }), hasTouch);
  const dialog = page.getByRole('dialog', { name: 'Submit practice exam?' });
  await expect(dialog).toBeVisible();
  await activate(dialog.getByRole('button', { name: 'Submit anyway', exact: true }), hasTouch);
  await expect(page).toHaveURL(/results/);
  await expect(page.locator('#results-title')).toHaveText('Rules Drill');
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('ns-learner-scores')!).length),
  ).toBe(1);
});

test('flashcard details, known marks and navigation respond without click-through', async ({
  page,
  hasTouch,
}) => {
  await page.goto('/flashcards/');
  const title = page.locator('#flashcards-title');
  await expect(title).toBeVisible();
  const before = await title.innerText();
  await activate(page.getByRole('button', { name: /^Mark .+ as known$/ }), hasTouch);
  await expect(page.getByRole('button', { name: /^Mark .+ as not known$/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await activate(page.getByRole('button', { name: 'Details', exact: true }), hasTouch);
  await page.keyboard.press('ArrowRight');
  await expect(title).toHaveText(before);
  await activate(page.getByRole('button', { name: 'Close dialog', exact: true }), hasTouch);
  await activate(page.getByRole('button', { name: 'Next flashcard', exact: true }), hasTouch);
  await expect(title).not.toHaveText(before);
});
