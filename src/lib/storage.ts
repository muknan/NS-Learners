import type { AnswerOption, ExamSession, ExamSettings, HistoryEntry } from '@/types/exam';
import { normalizeSettings } from '@/lib/session';
import { EXAM_MODES, normalizeModeId } from '@/lib/modes';

export const CURRENT_SESSION_KEY = 'nsLearner.currentSession';
export const COMPLETED_SESSION_KEY = 'nsLearner.completedSession';
export const SETTINGS_KEY = 'nsLearner.settings';
export const HISTORY_KEY = 'ns-learner-scores';
export const THEME_KEY = 'nsLearner.theme';
export const KEYBOARD_HINT_KEY = 'nsLearner.keyboardHintSeen';
export const SECTION_BREAK_SEEN_KEY = 'nsLearner.sectionBreakSeen';
export const ADVANCE_DURATION_KEY = 'ns-learner-advance-duration';
export const RETAKE_QUESTIONS_KEY = 'ns-retake-questions';
export const SESSION_CHANGE_EVENT = 'nsLearner.sessionChange';

const HISTORY_LIMIT = 10;
const DEFAULT_ADVANCE_DURATION = 3;

export function localGet<T>(key: string, fallback: T): T {
  const value = readJson(key, 'local');
  return value === null ? fallback : (value as T);
}

export function localSet(key: string, value: unknown): void {
  writeJson(key, value, 'local');
}

export function sessionGet<T>(key: string, fallback: T): T {
  const value = readJson(key, 'session');
  return value === null ? fallback : (value as T);
}

export function sessionSet(key: string, value: unknown): void {
  writeJson(key, value, 'session');
}

export function readSettings(): ExamSettings {
  return normalizeSettings(readJson(SETTINGS_KEY, 'local'));
}

export function saveSettings(settings: ExamSettings): void {
  writeJson(SETTINGS_KEY, settings, 'local');
}

export function readAdvanceDuration(): number {
  const storage = getStorage('local');

  if (!storage) {
    return DEFAULT_ADVANCE_DURATION;
  }

  try {
    return normalizeAdvanceDuration(storage.getItem(ADVANCE_DURATION_KEY));
  } catch {
    return DEFAULT_ADVANCE_DURATION;
  }
}

export function saveAdvanceDuration(value: number): void {
  try {
    getStorage('local')?.setItem(ADVANCE_DURATION_KEY, String(normalizeAdvanceDuration(value)));
  } catch {
    // Storage persistence is best-effort only.
  }
}

export function readCurrentSession(): ExamSession | null {
  return normalizeSession(readJson(CURRENT_SESSION_KEY, 'local'));
}

export function saveCurrentSession(session: ExamSession): void {
  writeJson(CURRENT_SESSION_KEY, session, 'local');
  writeJson(getModeSessionKey(session.mode), session, 'local');
  notifySessionChange();
}

export function clearCurrentSession(): void {
  getStorage('local')?.removeItem(CURRENT_SESSION_KEY);
  notifySessionChange();
}

export function readSessionForMode(modeId: string): ExamSession | null {
  const session = normalizeSession(readJson(getModeSessionKey(modeId), 'local'));
  if (!session || session.phase === 'complete') {
    return null;
  }
  return session;
}

export function readAllActiveSessions(): ExamSession[] {
  return Object.values(EXAM_MODES)
    .map((mode) => readSessionForMode(mode.id))
    .filter((session): session is ExamSession => session !== null);
}

export function saveSessionForMode(session: ExamSession): void {
  writeJson(getModeSessionKey(session.mode), session, 'local');
  notifySessionChange();
}

export function clearSessionForMode(modeId: string): void {
  const modeSession = readSessionForMode(modeId);
  const currentSession = readCurrentSession();

  getStorage('local')?.removeItem(getModeSessionKey(modeId));

  if (modeSession && currentSession?.id === modeSession.id) {
    getStorage('local')?.removeItem(CURRENT_SESSION_KEY);
  }

  notifySessionChange();
}

export function readCompletedSession(): ExamSession | null {
  return normalizeSession(readJson(COMPLETED_SESSION_KEY, 'local'));
}

export function saveCompletedSession(session: ExamSession): void {
  writeJson(COMPLETED_SESSION_KEY, session, 'local');
}

export function readHistory(): HistoryEntry[] {
  const value = readJson(HISTORY_KEY, 'local');

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isHistoryEntry).slice(0, HISTORY_LIMIT);
}

export function saveHistory(entry: HistoryEntry): void {
  const history = readHistory().filter((item) => item.id !== entry.id);
  writeJson(HISTORY_KEY, [entry, ...history].slice(0, HISTORY_LIMIT), 'local');
}

export function readBooleanFlag(key: string): boolean {
  try {
    return getStorage('local')?.getItem(key) === 'true';
  } catch {
    return false;
  }
}

export function saveBooleanFlag(key: string, value: boolean): void {
  try {
    getStorage('local')?.setItem(key, String(value));
  } catch {
    // Storage persistence is best-effort only.
  }
}

/** @deprecated Use {@link readBooleanLocalFlag} instead. */
export function readSessionBooleanFlag(key: string): boolean {
  return readBooleanLocalFlag(key);
}

/** Reads a boolean flag from localStorage. Despite the "Session" naming legacy,
 *  these flags persist across refreshes within a browser session (e.g. SECTION_BREAK_SEEN_KEY). */
export function readBooleanLocalFlag(key: string): boolean {
  try {
    return getStorage('local')?.getItem(key) === 'true';
  } catch {
    return false;
  }
}

/** @deprecated Use {@link saveBooleanLocalFlag} instead. */
export function saveSessionBooleanFlag(key: string, value: boolean): void {
  saveBooleanLocalFlag(key, value);
}

/** Saves a boolean flag to localStorage. */
export function saveBooleanLocalFlag(key: string, value: boolean): void {
  try {
    getStorage('local')?.setItem(key, String(value));
  } catch {
    // Storage persistence is best-effort only.
  }
}

/** @deprecated Use {@link clearLocalFlag} instead. */
export function clearSessionFlag(key: string): void {
  clearLocalFlag(key);
}

/** Removes a flag from localStorage. */
export function clearLocalFlag(key: string): void {
  try {
    getStorage('local')?.removeItem(key);
  } catch {
    // Storage persistence is best-effort only.
  }
}

function readJson(key: string, storageType: 'local' | 'session'): unknown {
  const storage = getStorage(storageType);

  if (!storage) {
    return null;
  }

  try {
    return JSON.parse(storage.getItem(key) ?? 'null') as unknown;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown, storageType: 'local' | 'session'): void {
  const storage = getStorage(storageType);

  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage persistence is best-effort only.
  }
}

function notifySessionChange(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

function getStorage(type: 'local' | 'session'): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return type === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function getModeSessionKey(modeId: string): string {
  return `ns-exam-session-${modeId}`;
}

function normalizeSession(value: unknown): ExamSession | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<ExamSession>;

  if (
    typeof candidate.id !== 'string' ||
    !Array.isArray(candidate.questionIds) ||
    typeof candidate.currentIndex !== 'number' ||
    !candidate.answers ||
    typeof candidate.answers !== 'object' ||
    !candidate.optionOrder ||
    typeof candidate.optionOrder !== 'object'
  ) {
    return null;
  }

  return {
    id: candidate.id,
    phase:
      candidate.phase === 'in-progress' ||
      candidate.phase === 'review' ||
      candidate.phase === 'complete'
        ? candidate.phase
        : 'in-progress',
    source: candidate.source === 'missed' ? 'missed' : 'full',
    mode: normalizeModeId(candidate.mode),
    questionIds: candidate.questionIds.filter((id): id is string => typeof id === 'string'),
    optionOrder: normalizeStringRecord(candidate.optionOrder),
    currentIndex: candidate.currentIndex,
    answers: normalizeAnswers(candidate.answers),
    flaggedIds: Array.isArray(candidate.flaggedIds)
      ? candidate.flaggedIds.filter((id): id is string => typeof id === 'string')
      : [],
    instantFeedback:
      typeof candidate.instantFeedback === 'boolean'
        ? candidate.instantFeedback
        : (normalizeSettings(candidate.settings).instantFeedback ?? false),
    autoAdvance:
      typeof candidate.autoAdvance === 'boolean'
        ? candidate.autoAdvance
        : normalizeSettings(candidate.settings).autoAdvance,
    previousAutoAdvance:
      typeof candidate.previousAutoAdvance === 'boolean'
        ? candidate.previousAutoAdvance
        : normalizeSettings(candidate.settings).autoAdvance,
    autoAdvanceDurationMs: normalizeAdvanceDurationMs(candidate.autoAdvanceDurationMs),
    autoAdvancedIds: Array.isArray(candidate.autoAdvancedIds)
      ? candidate.autoAdvancedIds.filter((id): id is string => typeof id === 'string')
      : [],
    shouldAutoAdvance: candidate.shouldAutoAdvance === true,
    settings: normalizeSettings(candidate.settings),
    startedAt: typeof candidate.startedAt === 'number' ? candidate.startedAt : Date.now(),
    expiresAt: typeof candidate.expiresAt === 'number' ? candidate.expiresAt : null,
    completedAt: typeof candidate.completedAt === 'number' ? candidate.completedAt : null,
  };
}

function normalizeAdvanceDuration(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    return DEFAULT_ADVANCE_DURATION;
  }

  return Math.min(8, Math.max(2, Math.round(numeric * 2) / 2));
}

function normalizeAdvanceDurationMs(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    return DEFAULT_ADVANCE_DURATION * 1000;
  }

  return normalizeAdvanceDuration(numeric / 1000) * 1000;
}

function normalizeAnswers(value: object): Record<string, AnswerOption['id']> {
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, AnswerOption['id']] =>
        typeof entry[0] === 'string' &&
        (entry[1] === 'a' || entry[1] === 'b' || entry[1] === 'c' || entry[1] === 'd'),
    ),
  );
}

function normalizeStringRecord(value: object): Record<string, AnswerOption['id'][]> {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, optionIds]) => {
      if (!Array.isArray(optionIds)) {
        return [];
      }

      return [
        [
          key,
          optionIds.filter(
            (id): id is AnswerOption['id'] => id === 'a' || id === 'b' || id === 'c' || id === 'd',
          ),
        ],
      ];
    }),
  );
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as Partial<HistoryEntry>;
  return (
    typeof item.id === 'string' &&
    typeof item.completedAt === 'number' &&
    typeof item.correct === 'number' &&
    typeof item.total === 'number' &&
    typeof item.percentage === 'number' &&
    (typeof item.passed === 'boolean' || item.passed === null)
  );
}
