'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { HISTORY_KEY, readAdvanceDuration, saveAdvanceDuration, THEME_KEY } from '@/lib/storage';

type Theme = 'light' | 'dark';

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [advanceDuration, setAdvanceDuration] = useState(3);

  useEffect(() => {
    if (open) {
      setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
      setAdvanceDuration(readAdvanceDuration());
    }
  }, [open]);

  if (!open) {
    return null;
  }

  function updateTheme(dark: boolean): void {
    const nextTheme = dark ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    try {
      window.localStorage.setItem(THEME_KEY, nextTheme);
    } catch {
      // Theme persistence is best-effort only.
    }
    window.dispatchEvent(new Event('ns-learner-theme-change'));
  }

  function updateAdvanceDuration(value: number): void {
    setAdvanceDuration(value);
    saveAdvanceDuration(value);
    window.dispatchEvent(
      new CustomEvent('ns-learner-advance-duration-change', { detail: { value } }),
    );
  }

  function clearScoreHistory(): void {
    if (!window.confirm('Clear score history?')) {
      return;
    }
    window.localStorage.removeItem(HISTORY_KEY);
  }

  function clearAllAppData(): void {
    if (!window.confirm('Clear all NS Learner Test Practice data?')) {
      return;
    }

    for (const storage of [window.localStorage, window.sessionStorage]) {
      for (const key of Object.keys(storage)) {
        if (
          key.startsWith('ns-learner-') ||
          key.startsWith('nsLearner.') ||
          key.startsWith('ns-exam-session-')
        ) {
          storage.removeItem(key);
        }
      }
    }

    window.location.reload();
  }

  return (
    <Modal title="Practice settings" onClose={onClose}>
      <div className="settings-grid">
        <section className="settings-section" aria-labelledby="appearance-settings-title">
          <h3 id="appearance-settings-title">Appearance</h3>
          <ToggleSwitch
            id="theme-toggle-setting"
            label="Dark mode"
            checked={theme === 'dark'}
            onChange={updateTheme}
          />
        </section>

        <section className="settings-section" aria-labelledby="advance-settings-title">
          <h3 id="advance-settings-title">Auto-advance delay</h3>
          <div className="setting-row">
            <label htmlFor="advance-duration" className="setting-label">
              Auto-advance delay
              <span className="setting-value">{advanceDuration}s</span>
            </label>
            <input
              id="advance-duration"
              type="range"
              min={2}
              max={8}
              step={0.5}
              value={advanceDuration}
              onChange={(event) => updateAdvanceDuration(Number(event.target.value))}
            />
            <p className="setting-hint">
              How long to show feedback before moving to the next question.
            </p>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="keyboard-settings-title">
          <h3 id="keyboard-settings-title">Data & shortcuts</h3>
          <dl className="shortcut-list">
            <div>
              <dt>1-4</dt>
              <dd>Choose an answer</dd>
            </div>
            <div>
              <dt>F</dt>
              <dd>Flag the question</dd>
            </div>
            <div>
              <dt>← / →</dt>
              <dd>Move between questions</dd>
            </div>
            <div>
              <dt>N / P</dt>
              <dd>Next or previous question</dd>
            </div>
            <div>
              <dt>Enter / Space</dt>
              <dd>Continue or submit</dd>
            </div>
            <div>
              <dt>Esc</dt>
              <dd>Close panels and dialogs</dd>
            </div>
          </dl>
          <button className="settings-text-button" onClick={clearScoreHistory} type="button">
            Clear score history
          </button>
          <button
            className="settings-text-button settings-text-button--danger"
            onClick={clearAllAppData}
            type="button"
          >
            Clear all app data
          </button>
        </section>
      </div>
    </Modal>
  );
}
