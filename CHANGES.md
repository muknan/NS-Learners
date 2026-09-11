# Single-row mobile flashcard filters — 2026-09-11

Mobile category filters now scroll horizontally instead of wrapping. All seven
filters remain available, with native scrolling and explicit focus visibility for
keyboard users. Removed the flashcard page's vertical-only touch restriction so
horizontal gestures reach the filter row. Desktop wrapping remains unchanged.

Verified single-row layout, every filter's availability and keyboard/tap activation
at 320, 390 and 640px in mobile/desktop Chromium and WebKit; inspected screenshots.
Chromium also passed a browser touch-move swipe test. Existing anchored-control and
long-content checks passed in both themes. Lint, typecheck and production build pass.
No physical-device gesture verification is claimed.

# Stable flashcard controls — 2026-09-11

- Fixed image/text cards changing the height and position of Mark as Known, Details,
  Previous, Shuffle and Next. The card now fills a bounded study area with dedicated
  control rows; long content scrolls independently and resets to its top on each card.
- Image height is bounded on the image itself, preserving aspect ratio without
  cropping. Mobile controls have 44px touch targets and bottom safe-area padding.
- Extremely short/zoomed viewports retain page scrolling rather than hiding content
  or shrinking controls. No storage, navigation or learning semantics changed.
- Added position and activation checks across image and longest text-only cards,
  both themes, 320/375/390px portrait, short landscape and desktop in all four browser
  projects. Screenshots were inspected from Chromium and WebKit. Tests cover repeated
  navigation, content scroll reset, Details taps and keyboard focus restoration.
- Verification: 153 browser tests and 79 unit tests passed; lint, typecheck and
  production build passed. These are browser-engine/device-emulation checks, not
  physical-phone verification. Existing long-content/zoom and empty-state tests remain.
- The preceding mode-card change is included in the same verified release.

# Deliberate mode activation — 2026-09-10

Baseline: `45108fd`. Mode and Flashcards cards now contain one native action button.
Finger/stylus taps on titles, descriptions, metadata and card padding do not launch
anything, regardless of screen width. Mouse users retain whole-card activation and
hover; keyboard and assistive activation use the labelled button. Resume is unchanged.

The mouse shortcut checks the originating pointer-down type, activates only on click,
and clears cancelled gestures. WebKit testing caught a touch-generated click reporting
`pointerType: mouse`; inspecting only click would incorrectly launch the mode. Native
button activation is kept separate to avoid duplicate launches. Text selections do not
activate the surrounding card. Existing layout and button dimensions are preserved.

Regression coverage checks every destination, phone/wide layouts, actual WebKit and
Chromium taps/clicks, simulated stylus compatibility clicks, cancelled pointers, and
single-button keyboard navigation. No physical-device stylus verification is claimed.

# Touch hover correction — 2026-09-10

Baseline: `038d9d1`. Mobile browsers can retain `:hover` after a tap. All hover-only
rules now require `(hover: hover) and (pointer: fine)`, including navigation, answers,
Review buttons, cards and filters. Persistent selection, saved/current states, press
feedback and keyboard focus styles remain independent of hover. No event handlers changed.

New light/dark regressions cover actual WebKit/Chromium taps on navigation, answers and
Save to Review, preservation of intentional selection, and desktop hover/focus. The
touch checks failed against the previous export before passing against the correction.
All 137 browser cases pass; lint and the production build (including TypeScript) pass.

# Final rendered pass — 2026-09-09

Baseline: `9436ab9`. [Triage, evidence and proposed AGENTS.md rule](docs/final-pass-2026-09-09.md).

- Removed Save to Review's redundant native `title` popup with explicit user approval.
  Its visible label, accessible name and saved-state behavior are preserved. Exact
  native-popup clipping was not reproduced locally; no speculative z-index fix was made.
- Fixed additional, reproduced keyboard-outline clipping on Save and answer choices.
  Their clipped containers lacked room for the 2px outline plus 2px offset; 4px internal
  spacing preserves complete rings and existing scrolling. Before/after screenshots
  are in `docs/screenshots/final-pass-before` and `final-pass-after`.
- Confirmed the existing settings toggle fix in actual Chromium and WebKit engines,
  with desktop clicks/keyboard and emulated mobile taps. Physical devices remain untested.
- After passing unit and browser coverage, removed the redundant disabled click guard
  from ToggleSwitch; native disabled semantics still pass label/track activation tests.
- Added native-title regression checks, clipped-outline checks, and repeatable screenshots
  across both themes, desktop, narrow portrait and short landscape; inspected study pages
  and dialogs as well. Screenshots disable animation to avoid capturing transitional fades.

Validation: **129 browser tests, 78 unit tests, lint, typecheck, question validation and
production build pass**. Existing workspace-root and color-environment warnings remain.
No additional confirmed bug is deferred. Large-file splitting and an optional visible
Save label in short landscape are proposals only; no architecture or subjective redesign
was applied. The full audit records retained defensive logic and remaining confidence limits.

# Touch regression pass — 2026-09-09

Baseline: `98fca64`. [Triage, causal evidence and checked controls](docs/touch-audit-2026-09-09.md).

- **B1:** Fixed the settings panel disappearing before WebKit delivered a switch click.
  Commit `d179891` introduced blur dismissal that treated a null next-focus target as
  leaving the panel. Actual WebKit taps reproduced it; the isolated blur guard fixes it
  while preserving outside dismissal, Escape and keyboard focus behavior.
- **Q1:** Switch labels now activate the native button, including Dark mode. Labels do
  not initiate exam swipes; native click, keyboard and disabled semantics are retained.
- **D1:** Added mobile WebKit/Chromium and desktop WebKit interaction projects alongside
  full desktop Chromium coverage; CI installs both engines. Tests exercise the settings,
  adjacent actions, navigator, native dialogs, Review, flashcards and responsive layouts.
- **N1:** The audit records every suspect's disposition and proposes an AGENTS.md rule
  requiring real WebKit/Chromium tap checks for focus, overlay and gesture changes.

Verification: all 124 browser tests, 78 unit tests, lint, typecheck and production build
pass. The unchanged local parent-lockfile and test-runner
color-environment warnings remain informational; no unrelated parent files were edited.

Confidence limit: verified using actual WebKit/Chromium engines with device emulation,
not physical iOS Chrome or Android devices. The broader audit found no additional
confirmed app bug needing a change. No triaged bug is deferred.

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
