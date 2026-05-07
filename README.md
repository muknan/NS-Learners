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
pnpm install
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

## Question Data

Questions live in `src/data/questions.json` and are validated by `src/lib/questions.schema.ts`. Each question uses a stable `q-###` ID, `rules` or `signs` category, one of the allowed handbook topics, four options with IDs `a` through `d`, a `correctId`, a plain-language explanation, and an optional `handbookSection`.

Image questions must use a path under `public/signs/` or `public/images/` and must include `imageAlt`.

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
- `/exam?mode=assisted`
- `/exam?mode=all-questions`
- `/exam?mode=retake`
- `/results`
- `/handbooks`

## Architecture

The app uses App Router server pages for static shells and client components for exam interaction. Question data is imported statically and validated at module load plus prebuild. Exam sessions are stored in `sessionStorage` per mode, completed results are stored in `sessionStorage`, and score history plus settings are stored in `localStorage` through guarded helpers in `src/lib/storage.ts`.

Pure scoring, question loading, session creation, and storage normalization live under `src/lib/`. Exam state transitions live in `src/hooks/useExam.tsx`. UI primitives and feature components are split under `src/components/`, with design tokens centralized in `src/styles/tokens.css`.

## Keyboard Shortcuts

| Key                 | Action                              |
| ------------------- | ----------------------------------- |
| `1`-`4`             | Select an answer                    |
| `ArrowRight` or `N` | Next question                       |
| `ArrowLeft` or `P`  | Previous question                   |
| `F`                 | Flag or unflag the current question |
| `?`                 | Open the keyboard shortcuts modal   |
| `Escape`            | Close panels and dialogs            |

## Deployment

Production is deployed on Vercel at `https://nova-scotia-learners-test.vercel.app/`. The linked Vercel project can be deployed manually with:

```bash
vercel --prod
```

Pushes to `main` are expected to deploy automatically through Vercel Git integration when the repository is connected.

## Known Limitations

The app is a study aid, not an official government test. Question wording is designed to match the handbook and common knowledge-test style, but users should still study the official Nova Scotia Driver's Handbook linked on the Handbooks page.
