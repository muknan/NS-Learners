import { expect, test } from '@playwright/test';

for (const theme of ['light', 'dark']) {
  test(`${theme} navigation and ghost controls have distinct hover fills and borders`, async ({
    page,
  }) => {
    await page.goto('/flashcards/');
    await page.evaluate((theme) => {
      document.documentElement.dataset.theme = theme;
    }, theme);
    await page.addStyleTag({ content: '* { transition: none !important; }' });
    for (const control of [
      page.locator('.site-nav a').first(),
      page.getByRole('button', { name: /^Mark .+ as known$/ }),
    ]) {
      const before = await control.evaluate((el) => {
        const s = getComputedStyle(el);
        return { background: s.backgroundColor, border: s.borderTopColor };
      });
      expect(before.border).not.toBe('rgba(0, 0, 0, 0)');
      await control.hover();
      const after = await control.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(after).not.toBe(before.background);
      await page.mouse.move(0, 0);
    }
  });
  test(`${theme} primary controls retain contrast at rest, hover and focus`, async ({ page }) => {
    await page.goto('/');
    await page.evaluate((theme) => {
      document.documentElement.dataset.theme = theme;
    }, theme);
    await page.addStyleTag({ content: '* { transition: none !important; }' });
    const controls = [
      page.getByRole('button', { name: 'Start Practice Exam', exact: true }),
      page.locator('.mode-card__cta.is-primary'),
    ];
    for (const control of controls) {
      for (const state of ['rest', 'hover', 'focus']) {
        if (state === 'hover') await control.hover();
        if (state === 'focus') {
          await page.mouse.move(0, 0);
          await control.locator('xpath=ancestor-or-self::button').focus();
        }
        const ratio = await control.evaluate((element) => {
          const style = getComputedStyle(element);
          const lum = (color: string) => {
            const channels = color
              .match(/[\d.]+/g)!
              .slice(0, 3)
              .map(Number)
              .map((v) => v / 255)
              .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
            return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
          };
          const a = lum(style.color),
            b = lum(style.backgroundColor);
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        });
        expect(ratio, `${theme} ${state}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
}

test('settings exposes selection and keeps storage errors in the active dialog', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('button', { name: '3s', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.evaluate(() => {
    localStorage.setItem('nsLearner.theme', 'light');
    Storage.prototype.removeItem = () => {
      throw new DOMException('Blocked', 'SecurityError');
    };
  });
  for (const label of ['Clear score history', 'Clear all app data']) {
    await page.getByRole('button', { name: label, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: `${label}?`, exact: true });
    await dialog.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('Could not');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  }
});

test('resume navigation and exit actions stay fully visible across widths', async ({ page }) => {
  await page.goto('/exam/?mode=rules-drill');
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await page.getByRole('button', { name: 'Save progress & exit', exact: true }).click();
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme);
    for (const width of [320, 375, 390, 520, 600, 760, 800, 1024, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const nav = page.getByRole('navigation', { name: 'Primary navigation' });
      const bounds = await nav.boundingBox();
      const rows = await nav
        .locator(':scope > a:visible, :scope > button:visible')
        .evaluateAll((items) => items.map((item) => item.getBoundingClientRect().y));
      expect(Math.max(...rows) - Math.min(...rows)).toBeLessThanOrEqual(2);
      for (const item of await nav.locator(':scope > a:visible, :scope > button:visible').all()) {
        const box = (await item.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        expect(box.x + box.width).toBeLessThanOrEqual(bounds!.x + bounds!.width + 1);
      }
    }
  }
  await page
    .getByLabel('Resume Rules Drill')
    .getByRole('button', { name: 'Resume', exact: true })
    .click();
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  for (const width of [320, 390, 800, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const save = (await page
      .getByRole('button', { name: 'Save progress & exit', exact: true })
      .boundingBox())!;
    const keep = (await page
      .getByRole('button', { name: 'Keep practicing', exact: true })
      .boundingBox())!;
    const discard = (await page
      .getByRole('button', { name: 'Exit without saving', exact: true })
      .boundingBox())!;
    expect(save.y + save.height).toBeLessThanOrEqual(keep.y);
    expect(keep.y).toBe(discard.y);
    expect(Math.abs(keep.width - discard.width)).toBeLessThan(1);
    const icon = await page.locator('.submit-warning svg').boundingBox();
    expect(icon!.width).toBe(24);
    expect(discard.x + discard.width).toBeLessThanOrEqual(width);
  }
});

test('navigator jumps to the first unanswered question', async ({ page }) => {
  await page.goto('/exam/?mode=rules-drill');
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Open question navigator' }).click();
  await page.getByRole('button', { name: 'First unanswered', exact: true }).click();
  await expect(page.getByTestId('exam-top-bar')).toContainText('Q 2/');
  await expect(page.getByRole('dialog', { name: 'Question navigator' })).toHaveCount(0);
});

test('settings fits without scrolling and shortcuts expand on demand', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  for (const width of [320, 390, 800, 1280]) {
    await page.setViewportSize({ width, height: 720 });
    expect(
      await page
        .getByRole('dialog', { name: 'Practice settings' })
        .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
    ).toBe(true);
  }
  await page.getByText('Keyboard shortcuts', { exact: true }).click();
  await expect(page.getByText('Choose an answer', { exact: true })).toBeVisible();
});
