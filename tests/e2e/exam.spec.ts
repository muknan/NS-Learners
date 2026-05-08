import { expect, test, type Page } from '@playwright/test';

const viewportMatrix = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 14', width: 390, height: 844 },
  { name: 'Pixel 7', width: 412, height: 915 },
  { name: 'iPhone landscape', width: 844, height: 390 },
  { name: 'iPad portrait', width: 768, height: 1024 },
  { name: 'iPad landscape', width: 1024, height: 768 },
  { name: 'Laptop', width: 1280, height: 720 },
  { name: 'Laptop HD', width: 1366, height: 768 },
  { name: 'Desktop', width: 1440, height: 900 },
  { name: 'Desktop large', width: 1920, height: 1080 },
] as const;

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

test('auto-advances after an answer when instant feedback is off', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.setItem('nsLearner.keyboardHintSeen', 'true');
    window.localStorage.setItem('ns-learner-advance-duration', '3');
    for (const storage of [window.localStorage, window.sessionStorage]) {
      for (const key of Object.keys(storage)) {
        if (key.startsWith('ns-exam-session-') || key === 'nsLearner.currentSession') {
          storage.removeItem(key);
        }
      }
    }
  });

  await page.getByRole('button', { name: /start practice exam/i }).click();
  await expect(page.getByTestId('exam-top-bar')).toContainText('Q 1 / 40');
  await page.getByTestId('answer-option').first().click();

  const nextButton = page.getByTestId('exam-action-bar').getByRole('button', { name: /^next$/i });
  await expect(nextButton).toHaveClass(/is-counting/);
  const countdown = nextButton.locator('.next-button__countdown');
  const countdownLine = nextButton.locator('.next-button__countdown-line');
  await expect(countdown).toBeVisible();
  const buttonBox = await nextButton.boundingBox();
  const countdownBox = await countdown.boundingBox();
  expect(buttonBox).not.toBeNull();
  expect(countdownBox).not.toBeNull();
  if (!buttonBox || !countdownBox) {
    throw new Error('Expected the Next button countdown to have measurable bounds');
  }
  expect(countdownBox.width).toBeGreaterThanOrEqual(buttonBox.width - 3);
  expect(countdownBox.height).toBeGreaterThanOrEqual(2.5);
  expect(countdownBox.height).toBeLessThanOrEqual(3.5);
  expect(
    Math.abs(countdownBox.y + countdownBox.height - (buttonBox.y + buttonBox.height)),
  ).toBeLessThanOrEqual(1);
  const countdownStyle = await countdownLine.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      animationName: style.animationName,
      strokeDasharray: style.strokeDasharray,
      strokeLinecap: style.strokeLinecap,
      strokeWidth: style.strokeWidth,
    };
  });

  expect(countdownStyle.animationName).toBe('advance-countdown');
  expect(countdownStyle.strokeDasharray).toBe('1px');
  expect(countdownStyle.strokeLinecap).toBe('butt');
  expect(countdownStyle.strokeWidth).toBe('3px');
  await expect(page.getByTestId('exam-top-bar')).toContainText('Q 2 / 40', { timeout: 4500 });
});

test.describe('exam viewport fit', () => {
  test.setTimeout(180_000);

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`keeps the active question and drawer inside the viewport in ${colorScheme} mode`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });

      for (const viewport of viewportMatrix) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await startFreshFullTest(page, colorScheme);

        await expect(page.getByTestId('exam-shell')).toBeVisible();
        await assertExamFit(page, `${viewport.name} ${colorScheme} initial question`);

        await goToQuestionWithImageState(page, true);
        await assertExamFit(page, `${viewport.name} ${colorScheme} image question`);

        await goToQuestionWithImageState(page, false);
        await assertExamFit(page, `${viewport.name} ${colorScheme} rules question`);

        await page.getByRole('button', { name: 'Open question navigator' }).click();
        await expect(page.getByTestId('navigator-drawer')).toBeVisible();
        await expectNoPageScroll(page, `${viewport.name} ${colorScheme} drawer`);
        await expect(page.getByTestId('navigator-grid')).toHaveCSS('overflow-y', 'auto');
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('navigator-drawer')).toBeHidden();
      }
    });
  }
});

async function startFreshFullTest(page: Page, colorScheme: 'light' | 'dark') {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.setItem('nsLearner.keyboardHintSeen', 'true');
    for (const storage of [window.localStorage, window.sessionStorage]) {
      for (const key of Object.keys(storage)) {
        if (key.startsWith('ns-exam-session-') || key === 'nsLearner.currentSession') {
          storage.removeItem(key);
        }
      }
    }
  });
  await page.evaluate((theme) => {
    window.localStorage.setItem('nsLearner.theme', theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, colorScheme);
  const start = page.getByRole('button', { name: /start practice exam/i });
  await expect(start).toBeVisible();
  await start.click();
  await page.waitForURL(/\/exam/, { timeout: 5000 }).catch(async () => {
    await start.click();
    await page.waitForURL(/\/exam/, { timeout: 5000 });
  });
  await expect(page.getByTestId('answer-option').first()).toBeVisible();
}

async function goToQuestionWithImageState(page: Page, needsImage: boolean) {
  for (let index = 0; index < 45; index += 1) {
    const hasImage = (await page.getByTestId('sign-image').count()) > 0;
    if (hasImage === needsImage) {
      return;
    }

    const continueSection = page.getByRole('button', { name: /continue to section 2/i });
    if (await continueSection.isVisible()) {
      await continueSection.click();
      continue;
    }

    await page.getByRole('button', { name: /^next$/i }).click();
    await expect(page.getByTestId('answer-option').first()).toBeVisible();
  }

  throw new Error(`Could not find a question with image=${needsImage}`);
}

async function assertExamFit(page: Page, label: string) {
  await expectNoPageScroll(page, label);

  const viewportHeight = await page.evaluate(() => window.innerHeight);
  const locators = [
    page.getByTestId('exam-top-bar'),
    page.getByTestId('exam-question'),
    page.getByRole('button', { name: /flag/i }),
    page.getByRole('button', { name: /^(next|submit)$/i }),
  ];

  for (const locator of locators) {
    const box = await locator.boundingBox();
    expect(
      box,
      `${label}: expected ${await locator.first().textContent()} to be visible`,
    ).not.toBeNull();
    expect(box!.y, `${label}: element top`).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height, `${label}: element bottom`).toBeLessThanOrEqual(
      viewportHeight + 1,
    );
  }

  const answers = page.getByTestId('answer-option');
  const count = await answers.count();
  expect(count, `${label}: answer count`).toBe(4);

  for (let index = 0; index < count; index += 1) {
    const box = await answers.nth(index).boundingBox();
    expect(box, `${label}: answer ${index + 1} visible`).not.toBeNull();
    expect(box!.y, `${label}: answer ${index + 1} top`).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height, `${label}: answer ${index + 1} bottom`).toBeLessThanOrEqual(
      viewportHeight + 1,
    );
  }

  await expect(page.getByRole('button', { name: /flag/i })).toBeEnabled();
  await page.getByRole('button', { name: /flag/i }).click({ trial: true });
  await page.getByRole('button', { name: /^(next|submit)$/i }).click({ trial: true });
}

async function expectNoPageScroll(page: Page, label: string) {
  const metrics = await page.evaluate(() => ({
    documentScrollHeight: document.documentElement.scrollHeight,
    bodyScrollHeight: document.body.scrollHeight,
    scrollY: window.scrollY,
    windowHeight: window.innerHeight,
  }));

  expect(metrics.scrollY, `${label}: scrollY`).toBe(0);
  expect(metrics.documentScrollHeight, `${label}: document scrollHeight`).toBeLessThanOrEqual(
    metrics.windowHeight + 1,
  );
  expect(metrics.bodyScrollHeight, `${label}: body scrollHeight`).toBeLessThanOrEqual(
    metrics.windowHeight + 1,
  );
}
