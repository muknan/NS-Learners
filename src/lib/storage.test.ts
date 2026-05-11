import { beforeEach, describe, expect, it } from 'vitest';
import {
  readCurrentSession,
  readSettings,
  readHistory,
  saveHistory,
  readBooleanFlag,
  saveBooleanFlag,
  CURRENT_SESSION_KEY,
  SETTINGS_KEY,
  HISTORY_KEY,
} from '@/lib/storage';
import { DEFAULT_SETTINGS } from '@/lib/session';
import type { HistoryEntry } from '@/types/exam';

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('readCurrentSession', () => {
  it('returns null for invalid JSON', () => {
    window.localStorage.setItem(CURRENT_SESSION_KEY, '{broken');
    expect(readCurrentSession()).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    window.localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify({ id: 'test' }));
    expect(readCurrentSession()).toBeNull();
  });

  it('returns null when nothing is stored', () => {
    expect(readCurrentSession()).toBeNull();
  });
});

describe('readSettings', () => {
  it('returns DEFAULT_SETTINGS when nothing is stored', () => {
    expect(readSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('returns normalized settings for partial stored data', () => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ instantFeedback: true }));
    const result = readSettings();
    expect(result.instantFeedback).toBe(true);
    expect(typeof result.questionCount).not.toBe('undefined');
    expect(typeof result.timerMinutes).not.toBe('undefined');
  });

  it('does not throw for non-object stored data', () => {
    window.localStorage.setItem(SETTINGS_KEY, '"garbage"');
    expect(() => readSettings()).not.toThrow();
    expect(readSettings()).toEqual(DEFAULT_SETTINGS);
  });
});

describe('readHistory', () => {
  it('returns empty array when nothing is stored', () => {
    expect(readHistory()).toEqual([]);
  });

  it('returns empty array for non-array stored value', () => {
    window.localStorage.setItem(HISTORY_KEY, '"garbage"');
    expect(readHistory()).toEqual([]);
  });

  it('filters out malformed history entries', () => {
    window.localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify([
        { notAnEntry: true },
        {
          id: 'x',
          completedAt: 1,
          correct: 1,
          total: 2,
          percentage: 50,
          passed: false,
        },
      ]),
    );
    const result = readHistory();
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('x');
  });
});

describe('saveHistory and readHistory round-trip', () => {
  it('saves and retrieves a history entry', () => {
    const entry: HistoryEntry = {
      id: 'session-abc',
      completedAt: Date.now(),
      source: 'full',
      mode: 'full-test',
      correct: 18,
      total: 20,
      percentage: 90,
      passed: true,
      unanswered: 0,
      bySection: [],
      byCategory: [],
      byTopic: [],
    };

    saveHistory(entry);
    const result = readHistory();

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('session-abc');
    expect(result[0]?.correct).toBe(18);
  });
});

describe('readBooleanFlag', () => {
  it('returns false when nothing is stored', () => {
    expect(readBooleanFlag('nsLearner.testFlag')).toBe(false);
  });

  it('returns true when "true" is stored', () => {
    window.localStorage.setItem('nsLearner.testFlag', 'true');
    expect(readBooleanFlag('nsLearner.testFlag')).toBe(true);
  });

  it('returns false when "false" is stored', () => {
    window.localStorage.setItem('nsLearner.testFlag', 'false');
    expect(readBooleanFlag('nsLearner.testFlag')).toBe(false);
  });

  it('round-trips with saveBooleanFlag', () => {
    saveBooleanFlag('nsLearner.testFlag', true);
    expect(readBooleanFlag('nsLearner.testFlag')).toBe(true);
    saveBooleanFlag('nsLearner.testFlag', false);
    expect(readBooleanFlag('nsLearner.testFlag')).toBe(false);
  });
});
