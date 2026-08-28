import { useId, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  HelpCircle,
  Lock,
  ShieldCheck,
  SkipForward,
} from 'lucide-react';
import { Badge, Button, Card, CardBody, Textarea } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { FollowUpQuestion } from '@/types/contracts';

export type SmartFollowUpProps = {
  questions: FollowUpQuestion[];
  answers: Record<string, string>;
  onAnswer: (questionId: string, answer: string) => void;
  onFinish: () => void;
  onBack: () => void;
  /** True when every REQUIRED question has an answer. */
  canFinish: boolean;
};

const CUSTOM_ANSWER_LIMIT = 240;

/**
 * Smart Follow-Up (spec §7, §13.4) — a focused step, not a chat.
 *
 * Design rules encoded here:
 * - One question per card, with `1 of N` progress derived from the array (never hardcoded).
 *   The pips double as navigation and carry a tick once a question is answered.
 * - Nothing auto-advances (spec §24). Choosing an option records the answer and stops there;
 *   the user presses Next or Finish.
 * - `Skip` exists only where skipping is honest. On a required question the button is disabled
 *   AND the reason is written out in plain text — a greyed control with no explanation would
 *   just look broken.
 * - Options are native radios: real radio-group semantics, arrow-key navigation for free, and
 *   44px+ rows that never need fine pointer control (spec §24).
 *
 * Answers flow straight out through `onAnswer`; this component owns only the step index and
 * the per-question custom-answer draft.
 */
export function SmartFollowUp({
  questions,
  answers,
  onAnswer,
  onFinish,
  onBack,
  canFinish,
}: SmartFollowUpProps): JSX.Element {
  const groupName = useId();
  const [stepIndex, setStepIndex] = useState(0);
  const [customDrafts, setCustomDrafts] = useState<Record<string, string>>({});

  const total = questions.length;

  if (total === 0) {
    return (
      <Card elevation="card" className="overflow-hidden">
        <span aria-hidden="true" className="block h-1 bg-grad-primary" />
        <CardBody className="space-y-4 py-6">
          <p className="text-lg leading-relaxed text-ink">
            Nothing else to ask — we have everything we need to rewrite this without inventing
            anything.
          </p>
          <Button variant="primary" size="lg" trailingIcon={ArrowRight} onClick={onFinish}>
            Continue
          </Button>
        </CardBody>
      </Card>
    );
  }

  const index = Math.min(stepIndex, total - 1);
  const question = questions[index];
  const options = question.options ?? [];
  const currentAnswer = answers[question.id] ?? '';
  const customDraft = customDrafts[question.id] ?? '';
  const answered = currentAnswer.trim().length > 0;
  const isLast = index === total - 1;
  const blocked = question.required && !answered;

  const unansweredRequired = questions
    .map((item, position) => ({ item, position }))
    .filter(({ item }) => item.required && !(answers[item.id] ?? '').trim());

  const selectOption = (label: string): void => {
    setCustomDrafts((previous) => ({ ...previous, [question.id]: '' }));
    onAnswer(question.id, label);
  };

  const writeCustom = (value: string): void => {
    setCustomDrafts((previous) => ({ ...previous, [question.id]: value }));
    // A blank field clears the answer rather than storing whitespace.
    onAnswer(question.id, value.trim() ? value : '');
  };

  const goBack = (): void => {
    if (index === 0) {
      onBack();
      return;
    }
    setStepIndex(index - 1);
  };

  const handleSkip = (): void => {
    if (!isLast) {
      setStepIndex(index + 1);
      return;
    }
    if (canFinish) {
      onFinish();
      return;
    }
    const next = unansweredRequired[0];
    if (next) setStepIndex(next.position);
  };

  return (
    <div className="space-y-5">
      {/* The Honesty Guard, made visible before the first question (spec §13.4). */}
      <div className="flex items-start gap-4 rounded-card-lg border border-primary/25 bg-primary-soft px-4 py-4 sm:px-5">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-chip bg-surface shadow-card">
          <ShieldCheck aria-hidden="true" className="h-5 w-5 text-primary" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            Honesty guard
          </p>
          <p className="mt-1.5 text-base leading-relaxed text-ink">
            Before I rewrite this, I need {total === 1 ? 'one fact' : `${total} facts`} so I don’t
            invent a commitment. Anything you don’t tell me stays out of the message — it never
            gets filled in for you.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <p aria-live="polite" className="flex items-baseline gap-2">
          <span className="font-mono text-sm font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Question
          </span>
          <span className="font-display text-3xl font-semibold leading-none text-ink">
            {index + 1}
          </span>
          <span className="text-base font-semibold text-ink-muted">of {total}</span>
        </p>

        <ol className="flex items-center gap-2">
          {questions.map((item, position) => {
            const itemAnswered = Boolean((answers[item.id] ?? '').trim());
            const isCurrent = position === index;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setStepIndex(position)}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cn(
                    'inline-flex h-tap w-tap items-center justify-center rounded-chip border text-base font-bold transition-all duration-200 ease-spring',
                    isCurrent && 'border-primary bg-grad-primary text-surface shadow-glow-primary',
                    !isCurrent && itemAnswered && 'border-teal/50 bg-teal-soft text-teal-ink',
                    !isCurrent &&
                      !itemAnswered &&
                      'border-line-strong bg-surface text-ink shadow-card hover:border-primary hover:bg-primary-soft',
                    !isCurrent && 'motion-safe:hover:-translate-y-0.5',
                  )}
                >
                  <span className="sr-only">
                    {`Go to question ${position + 1}, ${itemAnswered ? 'answered' : 'not answered yet'}`}
                  </span>
                  {itemAnswered && !isCurrent ? (
                    <Check aria-hidden="true" className="h-5 w-5" />
                  ) : (
                    <span aria-hidden="true">{position + 1}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Keyed on the question so stepping forward or back re-plays the arrival. */}
      <Card
        key={question.id}
        elevation="lift"
        className="relative overflow-hidden motion-safe:animate-pop-in"
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-grad-primary" />

        <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3 border-b border-line/70 bg-wash-panel px-5 pb-4 pt-5 sm:px-6">
          <div className="flex min-w-0 items-start gap-3.5">
            <span
              aria-hidden="true"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-chip bg-primary font-mono text-base font-bold text-surface"
            >
              {index + 1}
            </span>
            <h2 className="font-display min-w-0 text-display-sm font-semibold leading-tight text-ink">
              <span className="sr-only">{`Question ${index + 1}: `}</span>
              {question.question}
            </h2>
          </div>
          <Badge tone={question.required ? 'primary' : 'slate'}>
            {question.required ? 'Required' : 'Optional'}
          </Badge>
        </div>

        <CardBody className="space-y-6 py-6 sm:px-6">
          {/* Always on screen, never behind an icon (spec §7). */}
          <div className="rounded-card border border-line bg-paper-sunk px-4 py-4">
            <p className="inline-flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-[0.16em] text-primary">
              <HelpCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
              Why are we asking?
            </p>
            <p className="mt-2 text-base leading-relaxed text-ink-muted">{question.reason}</p>
          </div>

          {options.length > 0 ? (
            <fieldset>
              <legend className="text-base font-bold text-ink">Pick the answer that is true</legend>
              <div className="mt-3.5 space-y-2.5">
                {options.map((option) => {
                  const checked = currentAnswer === option.label;
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        'flex min-h-tap cursor-pointer items-center gap-3.5 rounded-card border px-4 py-3.5 transition-all duration-200 ease-smooth',
                        checked
                          ? 'border-primary bg-primary-soft shadow-card'
                          : 'border-line-strong bg-surface hover:border-primary-ring hover:bg-primary-soft motion-safe:hover:-translate-y-0.5',
                      )}
                    >
                      <input
                        type="radio"
                        name={`${groupName}-${question.id}`}
                        value={option.id}
                        aria-label={option.label}
                        checked={checked}
                        onChange={() => selectOption(option.label)}
                        className="h-5 w-5 shrink-0 accent-primary"
                      />
                      <span
                        className={cn(
                          'text-base leading-relaxed text-ink',
                          checked ? 'font-semibold' : 'font-medium',
                        )}
                      >
                        {option.label}
                      </span>
                      {checked ? (
                        <Check
                          aria-hidden="true"
                          className="ml-auto h-5 w-5 shrink-0 text-primary"
                        />
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          <div className="rounded-card border border-dashed border-line-strong bg-paper-sunk/60 px-4 py-4">
            <Textarea
              label="Something else"
              hint="Optional. What you type here replaces the choice above and is used as your own words."
              placeholder="Something else…"
              rows={2}
              maxLength={CUSTOM_ANSWER_LIMIT}
              showCount
              value={customDraft}
              onChange={(event) => writeCustom(event.target.value)}
            />
          </div>
        </CardBody>
      </Card>

      {question.required ? (
        <p
          className={cn(
            'flex items-start gap-3 rounded-card border px-4 py-4 text-base font-semibold leading-relaxed',
            blocked
              ? 'border-amber/60 bg-amber-soft text-amber-ink'
              : 'border-line bg-surface text-ink-muted shadow-card',
          )}
        >
          <Lock aria-hidden="true" className="mt-0.5 h-[18px] w-[18px] shrink-0" />
          <span>
            {blocked
              ? 'This one is required, so Skip is switched off — without your answer the message would have to invent this fact, and it won’t.'
              : 'This one was required. Your answer is what the message will rely on, so there is nothing to skip.'}
          </span>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 rounded-card-lg border border-line bg-wash-panel px-4 py-4 shadow-card">
        <Button variant="outline" leadingIcon={ArrowLeft} onClick={goBack}>
          {index === 0 ? 'Back to message' : 'Previous'}
        </Button>

        {question.required ? (
          <Button variant="ghost" leadingIcon={Lock} disabled>
            Skip unavailable
          </Button>
        ) : (
          <Button variant="ghost" leadingIcon={SkipForward} onClick={handleSkip}>
            Skip this one
          </Button>
        )}

        <span className="ml-auto">
          {isLast ? (
            <Button
              variant="primary"
              size="lg"
              trailingIcon={ArrowRight}
              disabled={!canFinish}
              onClick={onFinish}
            >
              Finish and rewrite
            </Button>
          ) : (
            <Button
              variant="primary"
              trailingIcon={ArrowRight}
              disabled={blocked}
              onClick={() => setStepIndex(index + 1)}
            >
              Next question
            </Button>
          )}
        </span>
      </div>

      {isLast && !canFinish && unansweredRequired.length > 0 ? (
        <p className="flex items-start gap-3 rounded-card border border-amber/60 bg-amber-soft px-4 py-3.5 text-base font-semibold text-amber-ink">
          <Lock aria-hidden="true" className="mt-0.5 h-[18px] w-[18px] shrink-0" />
          <span>
            {unansweredRequired.length === 1
              ? `Question ${unansweredRequired[0].position + 1} still needs an answer before I can rewrite this.`
              : `Questions ${unansweredRequired
                  .map(({ position }) => position + 1)
                  .join(', ')} still need answers before I can rewrite this.`}
          </span>
        </p>
      ) : null}
    </div>
  );
}
