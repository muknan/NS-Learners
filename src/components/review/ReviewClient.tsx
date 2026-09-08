'use client';

import { useState } from 'react';
import { Bookmark, Check } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { SignImage } from '@/components/exam/SignImage';
import { useReview } from '@/hooks/useReview';
import { getQuestionById, getTopicLabel } from '@/lib/questions';
import { reviewPriority, type ReviewEntry } from '@/lib/review';

export function ReviewClient() {
  const { items, loaded, error, change } = useReview();
  const [filter, setFilter] = useState('all');
  const [category, setCategory] = useState('all');
  const [removed, setRemoved] = useState<{ id: string; entry: ReviewEntry } | null>(null);
  const entries = Object.entries(items).filter(([id]) => getQuestionById(id));
  const visible = entries
    .filter(
      ([id, item]) =>
        (filter === 'all' || (filter === 'saved' ? item.saved : item.wrongCount > 0)) &&
        (category === 'all' || getQuestionById(id)?.category === category),
    )
    .sort((a, b) => b[1].wrongCount - a[1].wrongCount || b[1].updatedAt - a[1].updatedAt);

  return (
    <div className="review-page">
      <header>
        <h1 id="review-title" tabIndex={-1}>
          Review
        </h1>
        <p>Your mistakes and saved questions, ready for another look.</p>
        <p>
          Wrong answers from completed attempts appear here. Unanswered questions do not count.
          Flags stay with an attempt; saved questions stay here until you mark them learned.
        </p>
      </header>
      <div className="review-legend" role="group" aria-label="Review color guide">
        <span className="review-tag review-low">1 mistake · Refresh</span>
        <span className="review-tag review-medium">2–3 · Practice more</span>
        <span className="review-tag review-high">4+ · Focus here</span>
        <span className="review-tag review-saved">Saved by you</span>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {!loaded ? (
        <p role="status">Loading Review…</p>
      ) : (
        <>
          <div className="review-toolbar">
            <div className="flashcard-filter-list" role="group" aria-label="Review filters">
              {(['all', 'mistakes', 'saved'] as const).map((value) => (
                <button
                  key={value}
                  className={`flashcard-filter-chip ${filter === value ? 'is-active' : ''}`}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {value === 'all' ? 'All' : value === 'mistakes' ? 'Mistakes' : 'Saved'} (
                  {
                    entries.filter(
                      ([, item]) =>
                        value === 'all' || (value === 'saved' ? item.saved : item.wrongCount > 0),
                    ).length
                  }
                  )
                </button>
              ))}
            </div>
            <div>
              <label htmlFor="review-topic">Topic</label>
              <select
                id="review-topic"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="all">All topics</option>
                <option value="rules">Road rules</option>
                <option value="signs">Road signs</option>
              </select>
            </div>
          </div>
          <p role="status">
            {visible.length} {visible.length === 1 ? 'question' : 'questions'} · Most mistakes first
          </p>
          {removed ? (
            <div className="review-undo">
              <span>Question marked learned.</span>
              <Button
                tone="ghost"
                size="sm"
                onClick={() =>
                  void change((store) => {
                    const current = store.items[removed.id];
                    store.items[removed.id] = current
                      ? {
                          wrongCount: current.wrongCount + removed.entry.wrongCount,
                          saved: current.saved || removed.entry.saved,
                          updatedAt: Math.max(current.updatedAt, removed.entry.updatedAt),
                        }
                      : removed.entry;
                  }).then((saved) => {
                    if (saved) {
                      setRemoved(null);
                      requestAnimationFrame(() =>
                        document.getElementById(`review-question-${removed.id}`)?.focus(),
                      );
                    }
                  })
                }
              >
                Undo
              </Button>
            </div>
          ) : null}
          {!visible.length && !error ? (
            <section className="review-empty">
              <h2>{entries.length ? 'No questions match these filters' : 'A fresh start'}</h2>
              <p>
                {entries.length
                  ? 'Choose another filter to see your questions.'
                  : 'Finish a practice attempt or use “Save to Review” on any test question to build your list.'}
              </p>
              {!entries.length ? (
                <ButtonLink href="/exam?mode=full-test">Start practising</ButtonLink>
              ) : null}
            </section>
          ) : (
            visible.map(([id, entry]) => {
              const question = getQuestionById(id)!;
              const priority = reviewPriority(entry.wrongCount);
              return (
                <article
                  key={id}
                  className={`review-question review-${entry.wrongCount ? priority.tone : 'saved'}`}
                >
                  <div className="review-question__meta">
                    <span>{getTopicLabel(question.topic)}</span>
                    {entry.wrongCount > 0 ? (
                      <span className={`review-tag review-${priority.tone}`}>
                        {entry.wrongCount} {entry.wrongCount === 1 ? 'mistake' : 'mistakes'} ·{' '}
                        {priority.label}
                      </span>
                    ) : null}
                    {entry.saved ? (
                      <span className="review-tag review-saved">
                        <Bookmark size={16} aria-hidden="true" /> Saved by you
                      </span>
                    ) : null}
                  </div>
                  <SignImage question={question} compact />
                  <h2 id={`review-question-${id}`} tabIndex={-1}>
                    {question.text}
                  </h2>
                  <ol className="review-options" type="A">
                    {question.options.map((option) => (
                      <li key={option.id}>{option.text}</li>
                    ))}
                  </ol>
                  <details className="review-answer">
                    <summary>Show answer & explanation</summary>
                    <p>
                      <strong>
                        {question.options.find((option) => option.id === question.correctId)?.text}
                      </strong>
                    </p>
                    <p>{question.explanation}</p>
                    {question.handbookSection ? <small>{question.handbookSection}</small> : null}
                  </details>
                  <Button
                    tone="ghost"
                    size="sm"
                    icon={<Check aria-hidden="true" />}
                    onClick={(event) => {
                      const card = event.currentTarget.closest('article');
                      const nextHeading =
                        card?.nextElementSibling?.querySelector<HTMLElement>('h2') ??
                        card?.previousElementSibling?.querySelector<HTMLElement>('h2') ??
                        document.getElementById('review-title');
                      let latest: ReviewEntry | undefined;
                      void change((store) => {
                        latest = store.items[id];
                        delete store.items[id];
                      }).then((saved) => {
                        if (saved && latest) {
                          setRemoved({ id, entry: latest });
                          nextHeading?.focus();
                        }
                      });
                    }}
                  >
                    Mark learned
                  </Button>
                </article>
              );
            })
          )}
          <p className="review-note">
            Stored in this browser. Marking learned clears this question from Review; a new mistake
            will bring it back. Your scores stay unchanged.
          </p>
        </>
      )}
    </div>
  );
}
