# Closing QOL pass — 2026-09-08

Baseline: `98cdd64`. The previous audits and Review implementation were reviewed before
changes; settled visual design, public APIs, storage models and architecture are preserved.
See [the pre-change triage](docs/closing-triage-2026-09-08.md).

## Resolved

| ID  | Change                                                                                                                                                                                     | Commit / coverage                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| B1  | Touch swipes on dialog text no longer change the underlying exam question. Normal question swipes still work.                                                                              | `06451d0`; `tests/e2e/closing.spec.ts`                                      |
| B2  | A failed Review update no longer strands an already-saved exam result. Results shows a warning and retry; recovery imports mistakes once and restores focus. Unreadable data is preserved. | `ed6638b`; two storage-failure cases in `tests/e2e/closing-storage.spec.ts` |
| D1  | `pnpm analyze` works on Windows and Unix, uses the app's webpack pipeline, and writes reports without launching browser windows. No new dependency.                                        | `83c15f7`; actual analyzer build completed                                  |
| Q1  | README now documents Flashcards, Review, persistence, result/Review recovery and data-clearing boundaries.                                                                                 | Documentation commit                                                        |
| N1  | This record and the triage provide a traceable closing summary.                                                                                                                            | Documentation commit                                                        |

Both behavioral bugs were reproduced with failing browser tests before their fixes.
No triaged bug remains unresolved.

## Verification

- Lint (zero ESLint warnings), TypeScript, 76 unit tests and production static build pass.
- All 72 Chromium browser tests pass against the rebuilt static export, covering exam
  completion, timers, resume/discard, keyboard/touch, storage errors, concurrent tabs,
  offline behavior, Review and responsive layouts in both themes.
- New recovery controls checked at 320, 390, 768 and 1440px; mobile/desktop screenshots
  inspected for readable wrapping and uncropped controls.
- `pnpm analyze` completed and reported client, nodejs and edge HTML report generation.
  Edge has no parsed bundle in this static app. A subsequent normal build replaces
  `.next`, so rerun the command to regenerate reports.
- Question-bank validation passed: 140 questions and 123 flashcards. No content edits.

## Known limits

- Chromium emulation is verified; WebKit and physical iOS remain unverified (the earlier
  WebKit installation stalled). No claim of universal device perfection.
- Malformed Review data is intentionally not automatically erased. Recovery needs valid
  browser data; there is no new migration or targeted reset flow in this pass.
- Retry can import only available score history (ten recent attempts). Browser-local
  data has no cloud backup; fix a persistent storage error before generating more results.
- Historical results still use the current question bank. Bank revision/snapshot
  migration needs a separately approved data-model design before answer-key/ID changes.
- Local Next builds emit the pre-existing workspace-root warning because an unrelated
  parent directory contains another lockfile. Playwright emits the host's conflicting
  color-environment warning. Neither is a failing check; parent files were not changed.

Suggested future AGENTS.md guidance: when changing exam overlays, verify both keyboard
and touch isolation; always rebuild the static export before browser regression tests.
This reinforces the modality gap behind B1 without introducing a new architecture rule.
