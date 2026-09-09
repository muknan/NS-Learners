import { expect, test, type Locator } from '@playwright/test';

async function expectUnclippedFocus(control: Locator) {
  await control.focus();
  const clippedBy = await control.evaluate((el) => {
    const style = getComputedStyle(el);
    const spread = parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
    const box = el.getBoundingClientRect();
    const failures: string[] = [];
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
      const css = getComputedStyle(parent);
      const bounds = parent.getBoundingClientRect();
      if (
        (/(hidden|auto|scroll|clip)/.test(css.overflowX) &&
          (box.left - spread < bounds.left - 0.5 || box.right + spread > bounds.right + 0.5)) ||
        (/(hidden|auto|scroll|clip)/.test(css.overflowY) &&
          (box.top - spread < bounds.top - 0.5 || box.bottom + spread > bounds.bottom + 0.5))
      ) {
        failures.push(parent.className || parent.tagName);
      }
    }
    return failures;
  });
  expect.soft(clippedBy).toEqual([]);
}

test('keyboard outlines fit the clipped exam content and answer list', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/exam/?mode=rules-drill');
  await expect(page.getByTestId('exam-shell')).toBeVisible();
  await page.keyboard.press('Tab');
  for (const [name, control] of [
    ['save', page.getByRole('button', { name: 'Save to Review', exact: true })],
    ['answer', page.getByRole('radio').first()],
  ] as const) {
    await control.focus();
    await page.screenshot({ path: test.info().outputPath(`${name}-outline.png`) });
    await expectUnclippedFocus(control);
  }
});

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: narrow study pages and dialogs visual audit`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: theme });
    for (const route of ['/', '/flashcards/', '/review/', '/handbooks/']) {
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible();
      await page.screenshot({
        path: test.info().outputPath(`${route.replaceAll('/', '') || 'home'}.png`),
        fullPage: true,
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        390,
      );
      if (route === '/' || route === '/flashcards/') {
        await page
          .getByRole('button', { name: route === '/' ? 'Settings' : 'Details', exact: true })
          .click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.screenshot({
          path: test.info().outputPath(`${route === '/' ? 'settings' : 'details'}.png`),
        });
        await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
        await expect(page.getByRole('dialog')).toBeHidden();
      }
    }
  });
  test(`${theme}: Save remains usable in portrait, desktop and short landscape`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/exam/?mode=rules-drill');
    await expect(page.getByTestId('exam-shell')).toBeVisible();
    for (const [width, height] of [
      [320, 740],
      [1440, 900],
      [740, 320],
    ]) {
      await page.setViewportSize({ width: width!, height: height! });
      const save = page.getByRole('button', { name: 'Save to Review', exact: true });
      await save.hover();
      await page.screenshot({
        path: test.info().outputPath(`save-hover-${width}.png`),
        fullPage: true,
      });
      await expect.soft(save).not.toHaveAttribute('title');
      const box = (await save.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width!);
      await save.focus();
      await page.screenshot({
        path: test.info().outputPath(`save-focus-${width}.png`),
        fullPage: true,
      });
      await page.keyboard.press('Enter');
      const saved = page.getByRole('button', { name: 'Saved to Review', exact: true });
      await expect(saved).toHaveAttribute('aria-pressed', 'true');
      await expect.soft(saved).not.toHaveAttribute('title');
      await page.screenshot({ path: test.info().outputPath(`saved-${width}.png`), fullPage: true });
      await saved.click();
      await expect(save).toHaveAttribute('aria-pressed', 'false');
    }
  });
}
