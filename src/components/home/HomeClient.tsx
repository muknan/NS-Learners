'use client';

import { BookOpen, Play, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EXAM_MODES, getExamMode } from '@/lib/modes';
import {
  clearSessionForMode,
  HISTORY_KEY,
  readAllActiveSessions,
  readHistory,
  readSessionForMode,
} from '@/lib/storage';
import type { ExamMode, ExamSession, HistoryEntry } from '@/types/exam';

interface HomeClientProps {
  flashcardTotal: number;
  stats: {
    total: number;
    topics: number;
    sections: string[];
  };
}

const modes = Object.values(EXAM_MODES);

export function HomeClient({ flashcardTotal, stats }: HomeClientProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [fullTestSession, setFullTestSession] = useState<ExamSession | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [clearHistoryOpen, setClearHistoryOpen] = useState(false);
  const [resetConfirmMode, setResetConfirmMode] = useState<string | null>(null);
  const [fullTestResetOpen, setFullTestResetOpen] = useState(false);
  const [resetAllConfirmOpen, setResetAllConfirmOpen] = useState(false);

  useEffect(() => {
    setSessions(readAllActiveSessions());
    setFullTestSession(readSessionForMode('full-test'));
    setHistory(readHistory());
    setHistoryLoaded(true);
  }, []);

  function startExam(mode: ExamMode = 'full-test'): void {
    router.push(`/exam?mode=${mode}`);
  }

  function startFreshFullTest(): void {
    clearSessionForMode('full-test');
    setFullTestSession(null);
    setSessions((prev) => prev.filter((s) => s.mode !== 'full-test'));
    router.push('/exam?mode=full-test');
  }

  function startFreshForMode(modeId: string): void {
    clearSessionForMode(modeId);
    setSessions((prev) => prev.filter((s) => s.mode !== modeId));
  }

  function clearHistory(): void {
    try {
      window.localStorage.removeItem(HISTORY_KEY);
    } catch {
      // Best effort only.
    }
    setHistory([]);
    setClearHistoryOpen(false);
  }

  function resetAllSessions(): void {
    for (const sess of activeResumeSessions) {
      clearSessionForMode(sess.mode);
    }
    setSessions(readAllActiveSessions());
    setResetAllConfirmOpen(false);
  }

  const activeResumeSessions = sessions.filter(
    (sess) => sess.mode !== 'full-test' && sess.phase !== 'complete',
  );

  return (
    <div className="home-layout">
      <section className="hero-section" aria-labelledby="home-title">
        <div className="hero-section__copy">
          <Badge tone="brand">Nova Scotia Class 7</Badge>
          <h1 id="home-title">Practice the Nova Scotia Class 7 learner test.</h1>
          <p>Free · No account · Works offline</p>
          <div className="hero-section__actions">
            <Button
              icon={<Play aria-hidden="true" />}
              size="lg"
              onClick={() => startExam('full-test')}
            >
              {fullTestSession ? 'Resume Practice Exam' : 'Start Practice Exam'}
            </Button>
            {fullTestSession ? (
              <Button tone="secondary" size="lg" onClick={() => setFullTestResetOpen(true)}>
                Start Fresh
              </Button>
            ) : null}
          </div>
        </div>

        <div className="hero-sign-wall" aria-hidden="true">
          {[
            { key: 'stop', src: '/signs/stop.svg' },
            { key: 'yield', src: '/signs/yield.svg' },
            { key: 'railway', src: '/signs/railway-crossing-ahead-warning.png' },
            { key: 'speed50', src: '/signs/speed50.svg' },
          ].map((sign) => (
            // eslint-disable-next-line @next/next/no-img-element -- Native img avoids SVG rendering issues in static export.
            <img alt="" height={112} key={sign.key} loading="lazy" src={sign.src} width={112} />
          ))}
        </div>
      </section>

      <section className="section-block" aria-labelledby="modes-title">
        <div className="section-heading">
          <Badge tone="neutral">{stats.total} questions</Badge>
          <h2 id="modes-title">Choose a practice mode.</h2>
        </div>
        <div className="mode-grid">
          {modes.map((mode) => (
            <article className="mode-card" key={mode.id}>
              <span className="mode-card__top">
                <span className="mode-card__category">{mode.categoryLabel}</span>
                <strong>{mode.label}</strong>
                <p>{mode.description}</p>
              </span>
              <span className="mode-card__bottom">
                <span className="mode-card__meta">{mode.stats.join(' · ')}</span>
                <button
                  className={
                    mode.ctaVariant === 'primary' ? 'mode-card__cta is-primary' : 'mode-card__cta'
                  }
                  onClick={() => startExam(mode.id)}
                  type="button"
                >
                  {mode.ctaLabel}
                </button>
              </span>
            </article>
          ))}
          <article className="mode-card">
            <span className="mode-card__top">
              <Badge tone="success">Flashcards</Badge>
              <strong>Chapter Flashcards</strong>
              <p>Quick-summary cards from every chapter — perfect for revision on the go.</p>
            </span>
            <span className="mode-card__bottom">
              <span className="mode-card__meta">{flashcardTotal} cards · Keyboard friendly</span>
              <Button
                tone="secondary"
                icon={<BookOpen aria-hidden="true" />}
                onClick={() => router.push('/flashcards')}
              >
                Open Flashcards
              </Button>
            </span>
          </article>
        </div>
      </section>

      {activeResumeSessions.length > 0 && (
        <section className="section-block" aria-labelledby="resume-title">
          <div className="section-heading resume-heading">
            <div>
              <Badge tone="warning">In progress</Badge>
              <h2 id="resume-title">Resume your practice</h2>
            </div>
            <Button
              tone="ghost"
              size="sm"
              icon={<Trash2 aria-hidden="true" />}
              onClick={() => setResetAllConfirmOpen(true)}
            >
              Reset All
            </Button>
          </div>
          <div className="resume-cards">
            {activeResumeSessions.map((sess) => (
              <Card
                className="resume-card"
                key={sess.id}
                aria-label={`Resume ${getExamMode(sess.mode).label}`}
              >
                <div>
                  <Badge tone="warning">In progress</Badge>
                  <h2>Resume your {getExamMode(sess.mode).label}</h2>
                  <p>
                    Question {sess.currentIndex + 1} of {sess.questionIds.length} is waiting.
                  </p>
                </div>
                <div className="resume-card__actions">
                  <Button
                    tone="secondary"
                    icon={<RotateCcw aria-hidden="true" />}
                    onClick={() => router.push(`/exam?mode=${sess.mode}`)}
                  >
                    Resume
                  </Button>
                  <Button tone="ghost" onClick={() => setResetConfirmMode(sess.mode)}>
                    Reset Progress
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="section-block" aria-labelledby="recent-title">
        <div className="section-heading">
          <Badge tone="success">Recent scores</Badge>
          <h2 id="recent-title">Last completed runs.</h2>
        </div>
        {!historyLoaded ? (
          <div className="history-list" aria-label="Loading recent scores">
            {[0, 1, 2].map((item) => (
              <div className="history-skeleton" key={item} />
            ))}
          </div>
        ) : history.length ? (
          <>
            <div className="history-list">
              {history.slice(0, 5).map((entry) => (
                <article className="history-item" key={entry.id}>
                  <ShieldCheck aria-hidden="true" />
                  <strong>{getExamMode(entry.mode).label}</strong>
                  <span>
                    {entry.correct}/{entry.total} ({entry.percentage}%)
                  </span>
                  <Badge
                    tone={entry.passed === null ? 'brand' : entry.passed ? 'success' : 'error'}
                  >
                    {entry.passed === null ? 'Score' : entry.passed ? 'Pass' : 'Fail'}
                  </Badge>
                  <small>{new Date(entry.completedAt).toLocaleDateString('en-CA')}</small>
                </article>
              ))}
            </div>
            <Button
              tone="ghost"
              size="sm"
              icon={<Trash2 aria-hidden="true" />}
              onClick={() => setClearHistoryOpen(true)}
            >
              Clear history
            </Button>
          </>
        ) : (
          <p className="empty-state">Complete a practice exam to see your scores here</p>
        )}
      </section>

      <section className="section-block" aria-labelledby="how-title">
        <div className="section-heading">
          <Badge tone="neutral">How it works</Badge>
          <h2 id="how-title">Practice in three clean steps.</h2>
        </div>
        <div className="steps-grid">
          <article>
            <span>01</span>
            <h3>Set your mode</h3>
            <p>Choose instant feedback or end-of-exam scoring, then set count and timer.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Answer and flag</h3>
            <p>Use the navigator, keyboard shortcuts, and review flags to move efficiently.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Review weak spots</h3>
            <p>See section breakdowns, missed answers, explanations, and retake only misses.</p>
          </article>
        </div>
      </section>
      <ConfirmDialog
        open={clearHistoryOpen}
        title="Clear recent score history?"
        description="This removes the saved scores shown on the home page from this browser."
        onCancel={() => setClearHistoryOpen(false)}
        onConfirm={clearHistory}
      />
      <ConfirmDialog
        open={resetConfirmMode !== null}
        title="Reset progress?"
        description="This will clear your current session and start over. Your answers so far will be lost."
        confirmLabel="Reset"
        cancelLabel="Cancel"
        onCancel={() => setResetConfirmMode(null)}
        onConfirm={() => {
          if (resetConfirmMode) {
            startFreshForMode(resetConfirmMode);
            setResetConfirmMode(null);
          }
        }}
      />
      <ConfirmDialog
        open={fullTestResetOpen}
        title="Start fresh full test?"
        description="This will discard your current full-test session and start a new one."
        confirmLabel="Start Fresh"
        cancelLabel="Cancel"
        onCancel={() => setFullTestResetOpen(false)}
        onConfirm={() => {
          startFreshFullTest();
          setFullTestResetOpen(false);
        }}
      />
      <ConfirmDialog
        open={resetAllConfirmOpen}
        title="Reset all practice sessions?"
        description="This will clear every in-progress session and start them over. Your answers so far will be lost."
        confirmLabel="Reset All"
        cancelLabel="Cancel"
        onCancel={() => setResetAllConfirmOpen(false)}
        onConfirm={resetAllSessions}
      />
    </div>
  );
}
