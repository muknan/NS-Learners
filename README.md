# NS Learner Test Practice

NS Learner Test Practice is a free public Nova Scotia Class 7 learner-test app built around static, validated question data, client-side exam state, offline support, and mode-specific practice flows for the real 40-question simulator, rules drills, signs drills, assisted learning, and full-bank revision.

## Tech Stack

- Next.js App Router
- React and TypeScript
- Zod for question-bank validation
- Vitest and React Testing Library
- Playwright for end-to-end checks
- next-pwa for offline caching
- Vercel for production hosting

## Local Development

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Useful checks:

```bash
pnpm validate-questions
pnpm lint
pnpm type-check
pnpm test
pnpm build
pnpm test:e2e
```

Run `pnpm analyze` to build with webpack and generate bundle reports in `.next/analyze/`.
The command works on Windows and Unix without opening browser windows automatically.

## Question Data

Questions live in `src/data/questions.json` and are validated by `src/lib/questions.schema.ts`. Each question uses a stable `q-###` ID, `rules` or `signs` category, one of the allowed handbook topics, four options with IDs `a` through `d`, a `correctId`, a plain-language explanation, and an optional `handbookSection`.

Image questions use a `/signs/` path under `public/signs/` and nonblank `imageAlt`. The schema rejects duplicate IDs, repeated question/image content, and repeated answer text. The build validates image existence, handbook references and enough questions for both sections.

To add questions:

1. Add entries to `src/data/questions.json`.
2. Keep IDs stable and never reuse an old ID for a different question.
3. Run `pnpm validate-questions`.
4. Run `pnpm test` and `pnpm build` before deploying.

## Modes

Mode definitions live in `src/lib/modes.ts`. Update that file to change labels, copy, question filters, question counts, timer behavior, pass marks, instant-feedback defaults, or auto-advance defaults.

The main routes are:

- `/` for mode selection and score history
- `/exam?mode=full-test`
- `/exam?mode=rules-drill`
- `/exam?mode=signs-drill`
- `/exam?mode=assisted` for untimed full-bank practice with instant feedback after each answer.
- `/exam?mode=all-questions` for untimed full-bank revision with scoring shown at the end.
- `/exam?mode=retake`
- `/results`
- `/handbooks`
- `/flashcards` for sign revision with remembered known cards
- `/review` for questions answered incorrectly or intentionally saved

Full Test contains twenty road-rule questions followed by twenty road-sign questions. Each section has thirty minutes and requires at least sixteen correct answers. Entering the second section locks the first; its timer begins immediately, including on the section-break screen. If the first section expires, the second starts; if the second expires, results are submitted. Practice modes are untimed and report a score without an official pass/fail verdict.

## Persistence and recovery

The exam Exit dialog offers Keep practicing, Exit without saving, and Save progress & exit. Saving retains the active attempt for Resume on the home page; discarding removes that attempt. Neither exit action adds a completed score. Timed test deadlines keep running while away and are not reset on resume. Failed saves keep the dialog open with an error so the learner can retry.

Version 2 sessions preserve shuffled question and option order, answers, flags, section timing and section-break acknowledgment across reloads. Compatible unversioned records are normalized conservatively; malformed IDs, option orders, indices and unsupported versions are rejected. New full tests use ordered sections; a legacy mixed attempt is scored by category and cannot pass without twenty questions in each category and sixteen correct in each.

Saving results and history must succeed before the active attempt is removed. If saving fails, keep the tab open, free browser storage and retry submission. Progress-save failures are shown in the exam. History is shared across tabs; `/results?historyId=...` selects that exact saved attempt.

Review collects incorrect answers from completed attempts; unanswered questions and discarded attempts do not count. One mistake is labelled Refresh, two or three Practice more, and four or more Focus here. Intentional saves have a separate violet badge and can coexist with a mistake count. Mark learned removes a question from Review, with an Undo action; an already-counted attempt cannot add it again. New mistakes can bring it back.

Review and flashcard progress stay in this browser. A Review write failure does not block an otherwise-saved result: the results page offers Retry Review update, importing available score history without counting attempts twice. Unreadable Review data is preserved rather than overwritten. Clear score history only clears recent scores; Clear all app data also removes Review, flashcard progress, sessions and preferences.

The timer combines the stored deadline with monotonic elapsed time and visibility updates. In-page backward clock changes cannot add time. A client-only offline app cannot authenticate elapsed time across device clock changes and reloads.

q-044 specifies paired solid/broken yellow centre lines. Its stable ID and answer key are unchanged; the distinction from a single solid yellow centre line follows [official Handbook Chapter 3, printed pages 84–85](https://novascotia.ca/sns/rmv/handbook/DH-Chapter3.pdf).

## Offline and verification

Run `pnpm build` before `pnpm test:e2e`: Playwright serves the actual static export on localhost:4174, including the production service worker. To preview the export manually, run `pnpm start`. CI builds, installs Chromium and runs this same browser suite, retaining failure artifacts.

After one successful online installation, the worker precaches the application routes and bundled assets. External handbook PDFs require an initial online fetch. Newly installed worker versions wait until older controlled tabs close; open exam pages are not forcibly reloaded. Offline availability still depends on browser storage permission and eviction. Development mode does not install the worker.

## Architecture

The app uses App Router server pages for static shells and client components for exam interaction. Question data is imported statically and validated at module load plus prebuild. Sessions, completed results, the ten most recent scores, and preferences use `localStorage` through `src/lib/storage.ts`. Each mode has a separate session key; retakes remain separate practice sessions. A browser Web Lock permits one open exam per mode across tabs. Different modes can run independently. Use a current browser over HTTPS (localhost works for development).

Pure scoring, question loading, session creation, and storage normalization live under `src/lib/`. Exam state transitions live in `src/hooks/useExam.tsx`. UI primitives and feature components are split under `src/components/`, with design tokens centralized in `src/styles/tokens.css`.

## Keyboard Shortcuts

| Key                 | Action                              |
| ------------------- | ----------------------------------- |
| `1`-`4`             | Select an answer                    |
| `ArrowRight` or `N` | Next question                       |
| `ArrowLeft` or `P`  | Previous question                   |
| `Enter` or `Space`  | Continue or submit                  |
| `F`                 | Flag or unflag the current question |
| `?`                 | Open the keyboard shortcuts modal   |
| `Escape`            | Close panels and dialogs            |

Shortcuts pause while a dialog is open or a text input has focus. Focused answer choices use Enter/Space to select and arrow keys to move between options; these do not navigate questions. Enter/Space on other controls preserve the control’s native action. New questions receive keyboard focus. Auto-advance is cancelled when opening exam overlays/settings; its default delay is three seconds.

## Deployment

Production is deployed on Vercel at `https://nova-scotia-learners-test.vercel.app/`. The linked Vercel project can be deployed manually with:

```bash
vercel --prod
```

Pushes to `main` are expected to deploy automatically through Vercel Git integration when the repository is connected.

## Known Limitations

The app is a study aid, not an official government test. Question wording is designed to match the handbook and common knowledge-test style, but users should still study the official Nova Scotia Driver's Handbook linked on the Handbooks page.

Historical detailed results are recomputed against the bundled bank. Before changing a correctId, deleting an ID, or reusing its meaning, implement a bank-revision/snapshot migration; this series does not introduce one. Repository branch protection is managed outside this codebase.
