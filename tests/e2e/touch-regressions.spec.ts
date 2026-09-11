import { expect, test, type Locator, type Page } from '@playwright/test';
import { EXAM_MODES } from '../../src/lib/modes';

test('mode card bodies are mouse shortcuts, never touch or pen launch targets', async ({
  page,
  hasTouch,
}) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const cards = page.locator('.mode-card');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const description = card.locator('.mode-card__description');
      await description.dispatchEvent('pointerdown', { pointerType: 'pen' });
      await description.dispatchEvent('pointerup', { pointerType: 'pen' });
      await description.dispatchEvent('click', { pointerType: 'mouse', detail: 1 });
      await expect(page).toHaveURL(/\/$/);
      if (hasTouch) {
        for (const target of [
          card.locator('strong'),
          description,
          card.locator('.mode-card__meta'),
        ]) {
          await target.tap();
          await expect(page).toHaveURL(/\/$/);
        }
        // The padding is also noninteractive, including on a wide touchscreen.
        await card.tap({ position: { x: 12, y: 12 } });
        await expect(page).toHaveURL(/\/$/);
        expect(
          await page.evaluate(() =>
            Object.keys(localStorage).filter((key) => key.startsWith('ns-exam-session-')),
          ),
        ).toEqual([]);
      } else {
        await description.click();
        await expect(page).toHaveURL(i === count - 1 ? /flashcards/ : /exam/);
        await page.goto('/');
      }
    }
  }
});

test('every mode has one native action that starts the intended destination', async ({
  page,
  hasTouch,
}) => {
  const destinations = [...Object.keys(EXAM_MODES), 'flashcards'];
  for (let i = 0; i < destinations.length; i++) {
    await page.goto('/');
    const card = page.locator('.mode-card').nth(i);
    await expect(card.getByRole('button')).toHaveCount(1);
    await expect(card).not.toHaveAttribute('tabindex');
    await activate(card.getByRole('button'), hasTouch);
    if (destinations[i] === 'flashcards') {
      await expect(page).toHaveURL(/flashcards/);
    } else {
      await expect(page).toHaveURL(new RegExp(`mode=${destinations[i]}`));
      await expect(page.getByTestId('exam-shell')).toBeVisible();
      expect(
        await page.evaluate(
          () => JSON.parse(localStorage.getItem('nsLearner.currentSession')!).mode,
        ),
      ).toBe(destinations[i]);
    }
  }
});

test('card buttons preserve keyboard navigation and explicit activation', async ({ page }) => {
  await page.goto('/');
  const buttons = page.locator('.mode-card button');
  await buttons.first().focus();
  await page.keyboard.press('Tab');
  await expect(buttons.nth(1)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page).toHaveURL(/mode=rules-drill/);
  await page.goto('/');
  await buttons.first().focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/mode=full-test/);
});

async function activate(control: Locator, touch: boolean) {
  if (touch) await control.tap();
  else await control.click();
}

for (const theme of ['light', 'dark']) {
  test(`${theme} hover belongs to a mouse; touch retains only intentional selection`, async ({
    page,
    hasTouch,
  }) => {
    await page.goto('/');
    await page.evaluate((theme) => {
      localStorage.setItem('nsLearner.theme', theme);
      document.documentElement.dataset.theme = theme;
    }, theme);
    await page.addStyleTag({ content: '* { transition: none !important; }' });
    const look = (el: Locator) =>
      el.evaluate((node) => {
        const css = getComputedStyle(node);
        return [css.backgroundColor, css.borderTopColor, css.color, css.transform];
      });
    const nav = page.getByRole('link', { name: 'Flashcards', exact: true });
    if (!hasTouch) {
      const rest = await look(nav);
      await nav.hover();
      expect(await look(nav)).not.toEqual(rest);
      await page.mouse.move(0, 0);
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus-visible')).toHaveCount(1);
      return;
    }
    // No hover selector should be active on a primary touch pointer, even if :hover sticks.
    expect(
      await page.evaluate(() => {
        const activeHover: string[] = [];
        const inspect = (rules: CSSRuleList) => {
          for (const rule of Array.from(rules)) {
            if (rule instanceof CSSMediaRule && !matchMedia(rule.conditionText).matches) continue;
            if (rule instanceof CSSStyleRule && rule.selectorText.includes(':hover'))
              activeHover.push(rule.selectorText);
            if ('cssRules' in rule) inspect((rule as CSSGroupingRule).cssRules);
          }
        };
        for (const sheet of Array.from(document.styleSheets)) inspect(sheet.cssRules);
        return activeHover;
      }),
    ).toEqual([]);
    await nav.tap();
    await expect(page).toHaveURL(/flashcards/);
    await expect(nav).toHaveAttribute('aria-current', 'page');
    const selectedNav = await look(nav);
    await page.locator('#flashcards-title').tap();
    expect(await look(nav)).toEqual(selectedNav);
    await page.goto('/exam/?mode=rules-drill');
    await expect(page.getByTestId('exam-shell')).toBeVisible();
    await page.addStyleTag({ content: '* { transition: none !important; }' });
    const opener = page.getByRole('button', { name: 'Exam settings', exact: true });
    if (await opener.isVisible()) await opener.tap();
    const auto = page.getByRole('switch', { name: /^Auto-advance/ });
    if ((await auto.getAttribute('aria-checked')) === 'true') await auto.tap();
    if (await opener.isVisible())
      await page.getByRole('button', { name: 'Close exam settings' }).tap();
    const answer = page.getByRole('radio').first();
    await answer.tap();
    await expect(answer).toHaveAttribute('aria-checked', 'true');
    const selectedAnswer = await look(answer);
    await page.getByTestId('exam-question').tap();
    expect(await look(answer)).toEqual(selectedAnswer);
    const save = page.getByRole('button', { name: 'Save to Review', exact: true });
    await save.tap();
    const saved = page.getByRole('button', { name: 'Saved to Review', exact: true });
    await expect(saved).toHaveAttribute('aria-pressed', 'true');
    const savedLook = await look(saved);
    await page.getByTestId('exam-question').tap();
    expect(await look(saved)).toEqual(savedLook);
  });
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
