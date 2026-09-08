# Closing-pass triage

Baseline: `98cdd64`. No AGENTS.md was found in the repository or its workspace parents.
Prior work is recorded in `docs/qol-audit-2026-09-07.md`, `docs/qol-audit-2026-09-08.md`
and `docs/review-qol-audit-2026-09-08.md`. Preserve those settled design/storage decisions.

| ID  | Group         | Severity | Location                                             | Finding and proposed fix                                                                                                                                                           |
| --- | ------------- | -------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Bugs          | Medium   | `src/components/exam/ExamClient.tsx`, touch handlers | Dialog text can bubble touch swipes into question navigation. Block gestures while dialogs are open and test normal swipes still work.                                             |
| B2  | Bugs          | Medium   | `ExamClient.tsx`, `ResultsClient.tsx`                | Review writes can block completion after the result/history saved. Isolate that failure, show a result-page warning and retry through existing Review storage.                     |
| Q1  | QOL / UX      | Low      | `README.md`                                          | Flashcards/Review routes and persistence are missing from the guide. Document implemented behavior and recovery.                                                                   |
| D1  | DX            | Medium   | `package.json`, analyzer launcher                    | `pnpm analyze` fails on Windows before starting Next; it also omits the required webpack flag. Use a portable, noninteractive report-generating launcher without new dependencies. |
| N1  | Nice-to-haves | Low      | `CHANGES.md`                                         | Add a short closing record mapping fixes to triage IDs, verification and known limits.                                                                                             |

No public-API, data-model or architecture change is proposed. Bank-revision migrations
remain a known limitation requiring a separate approved design. Do not automatically
erase unreadable Review data: preserve it and report the error.

Completion status and verification are recorded in CHANGES.md.
