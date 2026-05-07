'use client';

import { Play, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EXAM_MODES, getExamMode } from '@/lib/modes';
import { HISTORY_KEY, readCurrentSession, readHistory } from '@/lib/storage';
import type { ExamMode, ExamSession, HistoryEntry } from '@/types/exam';

interface HomeClientProps {
  stats: {
    total: number;
    topics: number;
    sections: string[];
  };
}

const modes = Object.values(EXAM_MODES);

export function HomeClient({ stats }: HomeClientProps) {
  const router = useRouter();
  const [session, setSession] = useState<ExamSession | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    setSession(readCurrentSession());
    setHistory(readHistory());
    setHistoryLoaded(true);
  }, []);

  function startExam(mode: ExamMode = 'full-test'): void {
    router.push(`/exam?mode=${mode}`);
  }

  function clearHistory(): void {
    if (!window.confirm('Clear recent score history?')) {
      return;
    }

    try {
      window.localStorage.removeItem(HISTORY_KEY);
    } catch {
      // Best effort only.
    }
    setHistory([]);
  }

  return (
    <div className="home-layout">
      <section className="hero-section" aria-labelledby="home-title">
        <div className="hero-section__copy">
          <Badge tone="brand">Nova Scotia Class 7</Badge>
          <h1 id="home-title">Practice the Nova Scotia Class 7 learner test.</h1>
          <p>Free · No account · Works offline</p>
          <div className="hero-section__actions">
            <Button
              icon={<Play aria-hidden="true" suppressHydrationWarning />}
              size="lg"
              onClick={() => startExam('full-test')}
            >
              Start Practice Exam
            </Button>
          </div>
        </div>

        <div className="hero-sign-wall" aria-hidden="true">
          {['stop', 'yield', 'school', 'speed50'].map((sign) => (
            <Image
              alt=""
              height={120}
              key={sign}
              src={`/signs/${sign}.svg`}
              unoptimized
              width={120}
            />
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
        </div>
      </section>

      {session && session.phase !== 'complete' ? (
        <Card className="resume-card" aria-label="Resume your session">
          <div>
            <Badge tone="warning">In progress</Badge>
            <h2>Resume your session</h2>
            <p>
              Question {session.currentIndex + 1} of {session.questionIds.length} is waiting.
            </p>
          </div>
          <Button
            tone="secondary"
            icon={<RotateCcw aria-hidden="true" suppressHydrationWarning />}
            onClick={() => router.push('/exam')}
          >
            Resume
          </Button>
        </Card>
      ) : null}

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
                  <ShieldCheck aria-hidden="true" suppressHydrationWarning />
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
              icon={<Trash2 aria-hidden="true" suppressHydrationWarning />}
              onClick={clearHistory}
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
    </div>
  );
}
