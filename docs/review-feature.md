# Review

Review is a browser-local revision list, separate from attempt flags and score history.

- Completed attempts add incorrect answers once per attempt. Correct and unanswered questions do not add mistakes. In-progress answers are not counted until submission.
- Existing retained score-history sessions are imported once. Older attempts no longer in history cannot be reconstructed.
- One mistake uses lime (Refresh), two or three amber (Practice more), and four or more coral (Focus here). Text labels and counts accompany every color.
- Save to Review bookmarks a question immediately, even when the attempt is subsequently discarded. Violet identifies intentional saves. Questions can have both mistake and saved indicators.
- Filters cover all questions, mistakes, intentional saves, and rules/signs. Highest mistake counts come first. Answers and explanations are initially collapsed for self-testing.
- Mark learned removes both the mistake count and intentional save. Undo restores the last removed question. A new completed mistake adds the question again with a fresh count; existing scores are unchanged.
- A retained attempt-ID ledger prevents result retries, reloads and history import from restoring learned questions or counting mistakes twice. Web Locks serialize browser-tab updates; storage events refresh other tabs.
- Storage errors are surfaced instead of claiming success. Clearing all app data also clears Review. Clearing score history alone preserves Review.
- The Review route is precached for offline use with the rest of the app. Data stays in the current browser; there is no account synchronization.

Navigation retains a single action row. At narrow widths theme selection is available in Settings; at 320px Start/Resume uses its text without an icon. Short landscape exams place road signs alongside the question and use an accessible bookmark icon for Save to Review.

Validation includes duplicate counting, learned/reset semantics, manual-save failures, persistence, history import, combined filters, responsive navigation and exam layouts. Review badge text contrast measured at least 5.09:1 in light mode and 5.97:1 in dark mode.
