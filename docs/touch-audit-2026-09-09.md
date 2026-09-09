# Touch regression and closing audit

Baseline: `98fca64`. The approved plan supplied the pre-change triage below. Prior audit
records and commit history were reviewed; no AGENTS.md exists in the repository.

## Triage and disposition

| ID  | Category      | Severity | Location                                                          | Fix / disposition                                                                                                      |
| --- | ------------- | -------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| B1  | Bug           | High     | `src/components/exam/ExamActionBar.tsx`                           | Ignore blur with no next focus target; retain known-outside focus, outside-pointer, Escape and Close dismissal. Fixed. |
| Q1  | QOL           | Medium   | `src/components/ui/ToggleSwitch.tsx`, exam swipe selector         | Native labels activate their switch once, including Dark mode. Labels are excluded from exam swipe initiation. Fixed.  |
| D1  | DX            | High     | `playwright.config.ts`, `.github/workflows/ci.yml`, browser tests | Add mobile Chromium, mobile WebKit and desktop WebKit interaction projects; CI installs both engines. Fixed.           |
| N1  | Documentation | Low      | `CHANGES.md`, this record                                         | Preserve causal evidence, checked suspects, verification limits and proposed contributor guidance. Completed.          |

## Root cause and causal check

`git blame` identifies `d179891` as adding both initial switch focus and unconditional
blur-to-outside dismissal. The shared switch's native click handler was not changed by
that commit. The later `06451d0` gesture guard does not prevent clicks.

On production in mobile WebKit, a real tap generated:

1. `pointerdown` on `auto-advance-toggle-compact`;
2. `blur` and `focusout` on `instant-feedback-toggle-compact`, with `relatedTarget: null`;
3. panel removal, no switch click, and unchanged stored Auto-advance state.

The new track-activation test also failed against the unchanged static export: the
Instant feedback switch disappeared before the expected state could be observed.
After changing only the blur condition, repeated track activation and reload persistence
passed in all four projects. Label semantics were added only after this isolated causal
check. No touchend/pointerup activation handlers, synthetic clicks or timing delays were added.

## Same-class inventory and general audit

| Area                                                                              | Result                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Compact switches, opener and Close                                                | B1 affected this shared wrapper; repeated track/label activation, null blur, internal focus, Tab/Shift+Tab, Escape and Close now pass.                                                                       |
| Inline switches and Dark mode                                                     | No blur-dismiss wrapper; native labels added under Q1. Track/label activation and keyboard/disabled unit checks pass.                                                                                        |
| Flag, Next, Explanation, Submit                                                   | Outside taps dismiss settings and retain the intended action; completion saves one result. Checked in all four browser targets.                                                                              |
| Navigator drawer and native dialogs                                               | Different dismissal mechanisms; selection, close, save/resume/discard and keyboard isolation checked. No same-pattern defect found.                                                                          |
| Review controls and flashcards                                                    | Native action buttons/details; save/reveal/learn/undo and known/details/next checked in both engines and input modes. No same-pattern defect found.                                                          |
| Exam gestures                                                                     | Existing dialog guards retained. Q1 excludes newly interactive labels; question swipe remains functional. Swipe propagation tests dispatch pointer events; toggle/label touch tests use actual browser taps. |
| Session transitions, deadlines, scoring, storage, concurrent tabs, offline worker | Current source paths and existing regression coverage reviewed. Full Chromium suite retained; no additional confirmed bug justified changing settled behavior.                                               |

Static search found exactly one `onBlur`/`relatedTarget` dismissal implementation. The
disabled wrapper and noninteractive switch thumb use intentional `pointer-events: none`;
enabled tracks are not disabled. No intercepting overlay or animation change was needed.

## Verification scope

The final suite has 124 browser cases: the original 72 Chromium regressions plus 13
interaction scenarios in each of four projects. Mobile projects use real Playwright taps
with iPhone 13 / Pixel 7 device emulation; desktop projects use click and keyboard input.
Settings layout checks cover both themes, 320/480/481/768/1440px widths and 740×320
landscape. Mobile WebKit screenshots in both themes were visually inspected.

WebKit 26.4 runs locally on Windows. The official download succeeded but Node extraction
stalled; native `tar` extraction of that same archive restored the executable. CI uses
Playwright's normal Linux installation. Neither physical iOS Chrome nor a physical Android
device was tested. Engine emulation is evidence for this event regression, not a claim to
cover browser chrome, OS gestures or every device.

An initial navigator test locator omitted the comma in the accessible name; it was
corrected without changing app behavior, then the complete suite was rerun.

## Proposed AGENTS.md rule

> Changes to focus management, overlays, switches or gesture handlers require actual
> tap-activation tests in WebKit and Chromium, plus keyboard regression coverage. Build
> the static export before browser checks. Visual checks and synthetic events alone do
> not establish touch compatibility. Read rendered accessible names when writing locators.

No data model, public component API, question content or architecture change was made.
Previously documented bank-revision and browser-storage limitations remain unchanged.
