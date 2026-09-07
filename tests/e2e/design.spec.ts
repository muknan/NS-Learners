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
