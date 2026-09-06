import { test, expect, type Page } from '@playwright/test';
import bank from '../../src/data/questions.json' with { type: 'json' };
import type { ExamSession, ModeId } from '../../src/types/exam';

function fixture(mode: ModeId = 'all-questions', count = 3): ExamSession {
  const pool =
    mode === 'full-test' && count === 40
      ? [
          ...bank.filter((q) => q.category === 'rules').slice(0, 20),
          ...bank.filter((q) => q.category === 'signs').slice(0, 20),
        ]
      : bank.slice(0, count);
  const ids = pool.map((q) => q.id);
  return {
    id: `test-${mode}`,
    mode,
    source: 'full',
    phase: 'in-progress',
    questionIds: ids,
    optionOrder: Object.fromEntries(ids.map((id) => [id, ['a', 'b', 'c', 'd']])),
    currentIndex: 0,
    answers: {},
    flaggedIds: [],
    instantFeedback: false,
    autoAdvance: false,
    previousAutoAdvance: false,
    autoAdvanceDurationMs: 2000,
    autoAdvancedIds: [],
    shouldAutoAdvance: false,
    settings: {
      instantFeedback: false,
      questionCount: null,
      timerMinutes: null,
      autoAdvance: false,
      autoAdvanceDurationMs: 2000,
    },
    startedAt: Date.now(),
    expiresAt: null,
    completedAt: null,
  };
}
async function seed(page: Page, records: Record<string, unknown>) {
  await page.goto('/');
  await page.evaluate((records) => {
    localStorage.clear();
    for (const [key, value] of Object.entries(records))
      localStorage.setItem(key, JSON.stringify(value));
  }, records);
}
async function start(page: Page, session = fixture()) {
  await seed(page, { [`ns-exam-session-${session.mode}`]: session });
  await page.goto(`/exam/?mode=${session.mode}`);
  await expect(page.getByTestId('exam-shell')).toBeVisible();
}
async function current(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('nsLearner.currentSession')!));
}

test('full test uses real ordered sections', async ({ page }) => {
  await seed(page, {});
  await page.goto('/exam/?mode=full-test');
  await expect(page.getByTestId('exam-shell')).toBeVisible();
  const session = await current(page);
  expect(session.questionIds.map((id: string) => bank.find((q) => q.id === id)?.category)).toEqual([
    ...Array(20).fill('rules'),
    ...Array(20).fill('signs'),
  ]);
});

test('retake retains mode, answers and full-test slot across reload', async ({ page }) => {
  const done = {
    ...fixture('assisted'),
    phase: 'complete',
    completedAt: Date.now(),
    answers: { 'q-001': 'a' },
  };
  await seed(page, {
    'nsLearner.completedSession': done,
    'ns-exam-session-full-test': fixture('full-test', 40),
  });
  await page.goto('/results/');
  await page.getByRole('button', { name: 'Retake missed only' }).click();
  await expect(page.getByTestId('exam-shell')).toBeVisible();
  expect((await current(page)).mode).toBe('retake');
  await page.getByRole('radio').first().click();
  const before = await current(page);
  await page.reload();
  await expect(page.getByTestId('exam-shell')).toBeVisible();
  expect((await current(page)).answers).toEqual(before.answers);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('ns-exam-session-full-test')!).questionIds.length,
    ),
  ).toBe(40);
});

test('history query selects requested result', async ({ page }) => {
  const old = {
    ...fixture('assisted', 2),
    id: 'older',
    phase: 'complete',
    completedAt: Date.now(),
    answers: { 'q-001': 'a', 'q-002': 'a' },
  };
  await seed(page, {
    'nsLearner.completedSession': { ...fixture(), phase: 'complete', completedAt: Date.now() },
    'ns-learner-scores': [
      {
        id: 'older',
        completedAt: Date.now(),
        correct: 2,
        total: 2,
        percentage: 100,
        passed: null,
        session: old,
      },
    ],
  });
  await page.goto('/results/?historyId=older');
  await expect(page.getByText('2 of 2 correct overall')).toBeVisible();
});

test('keyboard radio activation selects and arrow changes option', async ({ page }) => {
  await start(page);
  const radios = page.getByRole('radio');
  await radios.first().focus();
  await page.keyboard.press('Enter');
  await expect(radios.first()).toHaveAttribute('aria-checked', 'true');
  expect((await current(page)).currentIndex).toBe(0);
  await page.keyboard.press('ArrowRight');
  await expect(radios.nth(1)).toHaveAttribute('aria-checked', 'true');
  expect((await current(page)).currentIndex).toBe(0);
});

test('question navigation focuses the new question', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByTestId('exam-question')).toBeFocused();
});

test('leave dialog blocks answer shortcuts', async ({ page }) => {
  await start(page);
  await page.evaluate(() => history.back());
  await expect(page.getByRole('dialog', { name: 'Leave exam?' })).toBeVisible();
  await page.keyboard.press('1');
  expect((await current(page)).answers).toEqual({});
});

test('opening navigator cancels pending auto-advance', async ({ page }) => {
  await start(page, { ...fixture(), autoAdvance: true });
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Open question navigator' }).click();
  await page.waitForTimeout(2400);
  expect((await current(page)).currentIndex).toBe(0);
});

test('quota failure keeps attempt and permits retry', async ({ page }) => {
  await start(page, {
    ...fixture(),
    currentIndex: 2,
    answers: { 'q-001': 'a', 'q-002': 'a', 'q-003': 'a' },
  } as ReturnType<typeof fixture>);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Object.assign(window, {
      restoreStorage: () => {
        Storage.prototype.setItem = original;
      },
    });
    Storage.prototype.setItem = () => {
      throw new DOMException('Full', 'QuotaExceededError');
    };
  });
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByText(/Could not save your result/)).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem('ns-exam-session-all-questions')),
  ).not.toBeNull();
  await page.evaluate(() => (window as unknown as { restoreStorage: () => void }).restoreStorage());
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByText('3 of 3 correct overall')).toBeVisible();
});

test('a second tab cannot overwrite the active mode', async ({ page, context }) => {
  await start(page);
  const second = await context.newPage();
  await second.goto('/exam/?mode=all-questions');
  await expect(second.getByText(/already open in another tab/)).toBeVisible();
  await page.getByRole('radio').first().click();
  await page.waitForTimeout(300);
  expect(Object.keys((await current(page)).answers)).toHaveLength(1);
});

test('backward wall clock does not add time', async ({ page }) => {
  await start(page, { ...fixture('full-test', 40), expiresAt: Date.now() + 600000 } as ReturnType<
    typeof fixture
  >);
  await page.evaluate(() => {
    const now = Date.now.bind(Date);
    Date.now = () => now() - 3600000;
  });
  await page.waitForTimeout(500);
  const label = await page.getByRole('timer').getAttribute('aria-label');
  expect(Number(label!.split(':')[0])).toBeLessThanOrEqual(10);
});

test('zero-score topics appear in weakest topics', async ({ page }) => {
  await seed(page, {
    'nsLearner.completedSession': {
      ...fixture('assisted', 7),
      phase: 'complete',
      completedAt: Date.now(),
      answers: { 'q-001': 'a' },
    },
  });
  await page.goto('/results/');
  await expect(page.locator('.breakdown-subsection')).toContainText('Traffic Signals');
});

test('theme follows other tab preference', async ({ page, context }) => {
  await seed(page, {});
  const second = await context.newPage();
  await second.goto('/');
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(second.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('production worker supports a fresh offline mode and reload', async ({ page, context }) => {
  await page.goto('/');
  await expect
    .poll(() =>
      page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length),
    )
    .toBe(1);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  await context.setOffline(true);
  await page.goto('/exam/?mode=signs-drill');
  await expect(page.getByTestId('exam-shell')).toBeVisible();
  await page.getByRole('radio').first().click();
  const before = await current(page);
  await page.reload();
  await expect(page.getByTestId('exam-shell')).toBeVisible();
  expect((await current(page)).answers).toEqual(before.answers);
  await page.goto('/');
  await page.getByRole('button', { name: 'Start Practice Exam', exact: true }).click();
  await expect(page.getByTestId('exam-shell')).toBeVisible();
});

test('settings clears visible history without reloading home', async ({ page }) => {
  const session = { ...fixture('assisted'), phase: 'complete', completedAt: Date.now() };
  await seed(page, {
    'ns-learner-scores': [
      {
        id: session.id,
        completedAt: Date.now(),
        correct: 0,
        total: 3,
        percentage: 0,
        passed: null,
        mode: 'assisted',
        session,
      },
    ],
  });
  await page.reload();
  await expect(page.locator('.history-item')).toHaveCount(1);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Clear score history', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Clear score history?' })
    .getByRole('button', { name: 'Clear', exact: true })
    .click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.history-item')).toHaveCount(0);
});

test('nested settings confirmation owns Escape and focus', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Clear score history', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Clear score history?' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Clear score history?' })).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Practice settings' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Clear score history', exact: true }),
  ).toBeFocused();
  await page.mouse.click(2, 2);
  await expect(page.getByRole('dialog', { name: 'Practice settings' })).toHaveCount(0);
});

test('first-section expiry advances once and locks earlier questions', async ({ page }) => {
  await start(page, {
    ...fixture('full-test', 40),
    startedAt: Date.now() - 31 * 60000,
    expiresAt: Date.now() - 60000,
  });
  await expect(page.getByRole('heading', { name: 'Section 1 complete' })).toBeVisible();
  await page.getByRole('button', { name: /Continue to Section 2/ }).click();
  expect((await current(page)).currentIndex).toBe(20);
  await page.keyboard.press('p');
  expect((await current(page)).currentIndex).toBe(20);
  await page.reload();
  await expect(page.getByTestId('exam-question')).toBeVisible();
  expect((await current(page)).sectionBreakSeen).toBe(true);
});

test('expired final section submits once without resurrecting the active attempt', async ({
  page,
}) => {
  const session = {
    ...fixture('full-test', 40),
    currentIndex: 39,
    startedAt: Date.now() - 60 * 60000,
    sectionTwoStartedAt: Date.now() - 31 * 60000,
    expiresAt: Date.now() - 60000,
  };
  await seed(page, { 'ns-exam-session-full-test': session });
  await page.goto('/exam/?mode=full-test');
  await expect(page.getByText('0 of 40 correct overall')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('ns-exam-session-full-test'))).toBeNull();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('ns-learner-scores')!).length),
  ).toBe(1);
});

test('flashcard details blocks underlying keyboard navigation', async ({ page }) => {
  await page.goto('/flashcards/');
  await page.getByText('Details', { exact: true }).click();
  const dialog = page.getByRole('dialog');
  const before = await dialog.innerText();
  await page.keyboard.press('ArrowRight');
  expect(await dialog.innerText()).toBe(before);
});

test('primary and muted text tokens meet AA in both themes', async ({ page }) => {
  await page.goto('/');
  for (const theme of ['light', 'dark']) {
    const ratios = await page.evaluate((theme) => {
      document.documentElement.dataset.theme = theme;
      const style = getComputedStyle(document.documentElement);
      const lum = (name: string) => {
        const hex = style.getPropertyValue(name).trim().slice(1);
        const rgb = hex
          .match(/../g)!
          .map((v) => parseInt(v, 16) / 255)
          .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
      };
      return [
        ['--color-text-inverse', '--color-brand-primary'],
        ['--color-text-inverse', '--color-brand-secondary'],
        ['--color-text-muted', '--color-surface-card'],
        ['--color-text-muted', '--color-surface-muted'],
        ['--color-brand-primary', '--color-brand-tertiary'],
        ['--color-brand-dark', '--color-surface-card'],
      ].map(([a, b]) => (Math.max(lum(a!), lum(b!)) + 0.05) / (Math.min(lum(a!), lum(b!)) + 0.05));
    }, theme);
    expect(
      ratios.every((ratio) => ratio >= 4.5),
      `${theme}: ${ratios}`,
    ).toBe(true);
  }
});
