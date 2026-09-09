# Final rendered audit

Baseline: `9436ab9`. The working tree was clean. Read the prior audit records,
current components and git log/blame before proposing changes.

## Pre-change triage

| ID  | Group         | Severity | File                                                           | Finding / proposed action                                                                                                                                                                                                          |
| --- | ------------- | -------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Bugs          | High     | `src/components/exam/ExamActionBar.tsx`                        | Previously fixed WebKit blur-before-click unmount. Fresh 52-case four-project suite passes; preserve the fix.                                                                                                                      |
| B2  | Bugs          | Medium   | `src/components/review/SaveReviewButton.tsx`                   | Native title duplicates the label. User screenshot shows the reported popup; exact clipping has not been reproduced locally. Requested permission to remove the redundant popup, respecting the user's reproduce-first constraint. |
| Q1  | QOL-UX        | Low      | `src/styles/globals.css`                                       | Short landscape hides Save's text. Inspect before choosing a popup change; do not silently remove the only visible explanation.                                                                                                    |
| L1  | Logic & bloat | Low      | `src/components/ui/ToggleSwitch.tsx`                           | Native disabled button already suppresses click. Once existing disabled tests pass, remove redundant handler guard and rerun them.                                                                                                 |
| L2  | Logic & bloat | Low      | `src/components/exam/ExamClient.tsx`, `src/styles/globals.css` | 1,052 and 3,708 lines respectively. Propose separate extraction of session/overlay coordination and styles by feature; defer architectural restructuring.                                                                          |
| D1  | DX            | Medium   | `tests/e2e/final-visual.spec.ts`                               | Add repeatable screenshots and geometry/activation checks for Save across narrow, desktop and landscape layouts. Native browser-chrome title rendering is not captured reliably by page screenshots.                               |
| N1  | Nice-to-haves | Low      | `CHANGES.md`, this file                                        | Record evidence, limits and proposed AGENTS.md rule.                                                                                                                                                                               |

### Rendered-audit addition, before fixing

**B3 — Bugs, medium, `src/styles/globals.css`:** Save keyboard outline clips at
the content pane; answer outlines clip at both the answer list and content pane.
Actual desktop screenshots show missing top/side portions. A new geometry test
fails naming these exact clipping ancestors. Reserve the 2px outline plus 2px
offset inside the existing containers, preserving their scrolling behavior.

The user explicitly approved B2 popup removal after disclosure that exact native
popup clipping was not locally reproduced. Keep the existing accessible name,
including the pre-existing icon-only short-landscape layout. Two baseline tests
fail on native titles in both saved/unsaved states; this is a title-removal
regression check, not evidence of browser-chrome clipping reproduction.

## Initial evidence

- Rebuilt the production export before the current baseline run.
- All 52 touch-regression cases pass in desktop Chromium/WebKit and touch-emulated
  Chromium/WebKit. Physical iOS Chrome and Android devices are unavailable.
- Current exam screenshot inspected through the CUA browser tool.
- `git blame` confirms switch activation is native click, with labels added by
  `fcaa704`; panel blur guard is already fixed by `2a1749b`.
- Static title inventory finds one native title in app controls: SaveReviewButton.
  Other JSX title props are modal headings, not native hover titles. There is no
  custom tooltip element, boundary calculation or tooltip stacking context to fix.
- MDN documents native title behavior and accessibility limits:
  https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/title

## Proposed AGENTS.md rule

> Reproduce behavior failures before editing and keep red, green and cleanup steps
> separate. Rebuild the static export before browser tests. For visual changes,
> inspect actual screenshots at desktop, narrow portrait and short landscape sizes
> in both themes; DOM geometry alone is insufficient. Test focus/overlay/toggle
> changes with actual taps in WebKit and Chromium plus keyboard activation. State
> physical-device and browser-chrome capture limitations explicitly. Establish the
> event or rendering cause before adding handlers, timers, overflow or z-index fixes;
> remove duplication only after passing behavior coverage exists.

## Final audit and disposition

| Area                    | Evidence / disposition                                                                                                                                                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1 toggles              | 52 current cross-engine cases pass before changes, and again in the full final suite. Existing fix preserved. Inspected WebKit-touch and Chromium-touch settings screenshots.                                                                                                                                 |
| B2 native popup         | Removed as approved. Red title-absence assertions failed for both states and themes; green checks pass after the one-line removal. Browser-owned clipping itself remains unverified.                                                                                                                          |
| B3 clipped focus        | Two failing boundary assertions named the content pane and answer list. Before/after screenshots inspected; complete rings now fit. Shared selectors cover all Save uses and all exam answer choices.                                                                                                         |
| Q1 landscape            | 44px icon-only control remains usable with its accessible name; inspected light/dark 740x320 full-page screenshots. No automatic redesign.                                                                                                                                                                    |
| L1 guard                | All 78 existing unit tests passed first; guard removed separately after the UI fixes passed. All 78 still pass, including disabled label/track and keyboard activation.                                                                                                                                       |
| Shared patterns         | One shared ToggleSwitch, Button and Modal are already reused. Compact and inline settings reuse the same local renderer. No new tooltip component or duplicate event handlers added.                                                                                                                          |
| Defensive/storage logic | Reviewed useReview busy lock, loaded state, storage errors, Modal refs/cleanup and existing regression coverage. Retained them: concurrent writes, unavailable storage, unmount and focus restoration are reachable conditions. No other proven unreachable branch or unused export justified deletion.       |
| Wider UI                | Inspected actual light/dark screenshots for narrow Home, Settings, Flashcards, Details, empty Review and Handbooks. Full suite checks populated Review, filters, learn/undo, dialogs, results, timers, navigator, save/resume/discard, offline, contrast and viewport fit. No further confirmed defect found. |
| D1 screenshots          | Five added cases cover two themes and three Save viewports (320x740, 1440x900, 740x320), keyboard save/unsave and outline containment. Snapshot animations disabled after one intermediate image caught the question fade. Page screenshots are not native-browser-chrome screenshots.                        |

Retained key visual evidence:

- [Save before](screenshots/final-pass-before/save-outline.png) / [after](screenshots/final-pass-after/save-outline.png)
- [Answer before](screenshots/final-pass-before/answer-outline.png) / [after](screenshots/final-pass-after/answer-outline.png)
- [Dark landscape](screenshots/final-pass-after/dark-landscape.png)
- [Dark saved mobile](screenshots/final-pass-after/dark-saved-mobile.png)

The full final production-export suite passes: 129 browser cases, 78 unit tests,
lint, typecheck, build and question-bank validation. No public API, data model,
architecture or question-content change. Existing parent-lockfile and test-runner
color-environment warnings are informational and unrelated files were preserved.

## Suggestions only / confidence limits

- L2: split large exam orchestration and CSS by feature in a separately reviewed
  change; no large restructuring was attempted merely to reduce line counts.
- Optional QOL modernization: retain a visible Save label in short landscape by
  allowing a second toolbar row. Current behavior saves vertical space with an
  accessible icon button; the proposed alternative improves visual discoverability
  at the cost of question space. Not applied; requires user go-ahead.
- Native popup clipping was not reproduced, and physical iOS Chrome/Android,
  screen-reader operation and every possible content/OS combination were not tested.
  Passing the audited states is not a claim that every possible UI bug is eliminated.
- Previously documented storage and bank-revision limitations remain unchanged.
