'use client';

import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { useTheme } from '@/hooks/useTheme';
import { HISTORY_KEY, readAdvanceDuration, saveAdvanceDuration } from '@/lib/storage';

type PendingConfirm = 'score-history' | 'all-data' | null;
const ADVANCE_DURATION_OPTIONS = [2, 3, 5, 8] as const;

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, setTheme } = useTheme();
  const [advanceDuration, setAdvanceDuration] = useState(3);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null);

  useEffect(() => {
    if (open) {
      setAdvanceDuration(readAdvanceDuration());
    }
  }, [open]);

  if (!open) {
    return null;
  }

  function updateAdvanceDuration(value: number): void {
    setAdvanceDuration(value);
    saveAdvanceDuration(value);
    window.dispatchEvent(
      new CustomEvent('ns-learner-advance-duration-change', { detail: { value } }),
    );
  }

  function clearScoreHistory(): void {
    window.localStorage.removeItem(HISTORY_KEY);
    setPendingConfirm(null);
  }

  function clearAllAppData(): void {
    for (const storage of [window.localStorage, window.sessionStorage]) {
      for (const key of Object.keys(storage)) {
        if (
          key.startsWith('ns-learner-') ||
          key.startsWith('ns-learners.') ||
          key.startsWith('ns-retake-') ||
          key.startsWith('nsLearner.') ||
          key.startsWith('ns-exam-session-')
        ) {
          storage.removeItem(key);
        }
      }
    }

    setPendingConfirm(null);
    window.location.reload();
  }

  return (
    <>
      <Modal title="Practice settings" onClose={onClose}>
        <div className="settings-grid">
          <section className="settings-section" aria-labelledby="appearance-settings-title">
            <h3 id="appearance-settings-title">Appearance</h3>
            <ToggleSwitch
              id="theme-toggle-setting"
              label="Dark mode"
              checked={theme === 'dark'}
              onChange={(dark) => setTheme(dark ? 'dark' : 'light')}
            />
          </section>

          <section className="settings-section" aria-labelledby="advance-settings-title">
            <h3 id="advance-settings-title">Auto-advance delay</h3>
            <div className="setting-row">
              <div className="setting-label">
                Auto-advance delay
                <span className="setting-value">{advanceDuration}s</span>
              </div>
              <div className="delay-choice" role="group" aria-label="Auto-advance delay">
                {ADVANCE_DURATION_OPTIONS.map((duration) => (
                  <button
                    className={advanceDuration === duration ? 'is-active' : ''}
                    key={duration}
                    onClick={() => updateAdvanceDuration(duration)}
                    type="button"
                  >
                    {duration}s
                  </button>
                ))}
              </div>
              <p className="setting-hint">
                How long to show feedback before moving to the next question.
              </p>
            </div>
          </section>

          <section
            className="settings-section settings-section--data"
            aria-labelledby="keyboard-settings-title"
          >
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
            <button
              className="settings-text-button"
              onClick={() => setPendingConfirm('score-history')}
              type="button"
            >
              Clear score history
            </button>
            <button
              className="settings-text-button settings-text-button--danger"
              onClick={() => setPendingConfirm('all-data')}
              type="button"
            >
              Clear all app data
            </button>
          </section>
        </div>
      </Modal>
      <ConfirmDialog
        open={pendingConfirm === 'score-history'}
        title="Clear score history?"
        description="This removes your saved recent scores from this browser."
        onCancel={() => setPendingConfirm(null)}
        onConfirm={clearScoreHistory}
      />
      <ConfirmDialog
        open={pendingConfirm === 'all-data'}
        title="Clear all app data?"
        description="This removes settings, score history, saved sessions, and retake data from this browser."
        onCancel={() => setPendingConfirm(null)}
        onConfirm={clearAllAppData}
      />
    </>
  );
}
