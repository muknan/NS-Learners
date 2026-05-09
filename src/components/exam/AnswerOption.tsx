import { Check, X } from 'lucide-react';
import type { AnswerOption as AnswerOptionType } from '@/types/exam';

interface AnswerOptionProps {
  option: AnswerOptionType;
  index: number;
  selected: boolean;
  correct: boolean;
  wrong: boolean;
  showFeedback: boolean;
  disabled: boolean;
  onSelect: () => void;
}

export function AnswerOption({
  option,
  index,
  selected,
  correct,
  wrong,
  showFeedback,
  disabled,
  onSelect,
}: AnswerOptionProps) {
  const shortcutNumber = String(index + 1);
  const statusLabel = correct && showFeedback ? 'Correct answer' : wrong ? 'Your answer' : '';

  return (
    <button
      aria-checked={selected}
      className={[
        'answer-option',
        selected ? 'is-selected' : '',
        correct && showFeedback ? 'is-correct' : '',
        wrong ? 'is-wrong' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid="answer-option"
      disabled={disabled}
      onClick={onSelect}
      role="radio"
      type="button"
    >
      <span className="answer-option__letter" aria-hidden="true">
        {shortcutNumber}
      </span>
      <span className="answer-option__text">{option.text}</span>
      {statusLabel ? (
        <span className="answer-option__status">
          {correct ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
          {statusLabel}
        </span>
      ) : null}
    </button>
  );
}
