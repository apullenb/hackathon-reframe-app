import { useState } from 'react';
import { Plus, RotateCcw, Send, X } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Chip } from '@/components/ui';
import { CopyButton, SafetyNotice } from '@/components/shared';
import { cn } from '@/lib/cn';
import type { InspectOutcome, OutcomeNode } from './questionGraph';

/** One feeling word on the card. `kept` false means the user looked at it and said no. */
export type FeelingChip = {
  word: string;
  kept: boolean;
  /** true when the user typed it rather than the flow suggesting it */
  ownWords: boolean;
};

export type InsightCardProps = {
  node: OutcomeNode;
  /** Already has `{them}` filled in and the kept feelings applied. */
  outcome: InspectOutcome;
  feelings: readonly FeelingChip[];
  /** Anything the user typed along the way, shown back to them verbatim. */
  ownWords?: readonly string[];
  onToggleFeeling: (word: string) => void;
  onAddFeeling: (word: string) => void;
  onTakeToTranslator: (draft: string) => void;
  onStartOver: () => void;
};

const FIELD_CLASSES = cn(
  'min-h-tap w-full rounded-card border border-line-strong bg-paper-sunk/50 px-4 py-2.5',
  'text-base text-ink shadow-inner-top placeholder:text-ink-muted/70',
  'transition-[background-color,border-color] duration-200 ease-smooth',
  'hover:border-primary-ring/70 focus:border-primary-ring focus:bg-surface',
);

/**
 * The support version of the card. Reached only from the safety branch of the graph, and
 * deliberately short: no feeling chips to sort, no sentence to rehearse, no way through to the
 * translator. The one thing on offer is a person who can actually help.
 */
function SupportCard({
  node,
  outcome,
  onStartOver,
}: {
  node: OutcomeNode;
  outcome: InspectOutcome;
  onStartOver: () => void;
}): JSX.Element {
  return (
    <div className="space-y-5">
      <SafetyNotice
        safety={{
          category: node.safetyCategory ?? 'possible_abuse_or_coercion',
          userMessage: outcome.summary,
          allowStandardOutput: false,
        }}
      />

      <Card tone="default">
        <CardBody className="space-y-4 py-5">
          <p className="text-lg leading-relaxed text-ink">{outcome.underlying}</p>
          {node.supportNote ? (
            <p className="rounded-card bg-paper-sunk px-4 py-3.5 text-base leading-relaxed text-ink">
              {node.supportNote}
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Button variant="outline" size="md" leadingIcon={RotateCcw} onClick={onStartOver}>
        Start over
      </Button>
    </div>
  );
}

export function InsightCard({
  node,
  outcome,
  feelings,
  ownWords = [],
  onToggleFeeling,
  onAddFeeling,
  onTakeToTranslator,
  onStartOver,
}: InsightCardProps): JSX.Element {
  const [newWord, setNewWord] = useState('');

  if (node.variant === 'support') {
    return <SupportCard node={node} outcome={outcome} onStartOver={onStartOver} />;
  }

  const submitWord = (): void => {
    const word = newWord.trim();
    if (!word) return;
    onAddFeeling(word);
    setNewWord('');
  };

  return (
    <div className="space-y-5 motion-safe:animate-reveal-up">
      <Card tone="default" elevation="lift" glow>
        <CardHeader eyebrow="What it sounds like" title={node.headline} />

        <CardBody className="space-y-6 py-5">
          <p className="text-lg leading-relaxed text-ink">{outcome.summary}</p>

          {ownWords.length > 0 ? (
            <section className="space-y-2" aria-label="What you wrote">
              <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
                What you wrote
              </h3>
              <ul className="space-y-2">
                {ownWords.map((words) => (
                  <li
                    key={words}
                    className="border-l-2 border-line-strong pl-3.5 text-base leading-relaxed text-ink-muted"
                  >
                    {words}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="space-y-3" aria-labelledby="inspect-feelings-heading">
            <div className="space-y-1">
              <h3
                id="inspect-feelings-heading"
                className="font-display text-lg font-semibold tracking-tight text-ink"
              >
                The words on the table
              </h3>
              <p className="text-sm leading-relaxed text-ink-muted">
                These came out of your answers. Turn off any that are wrong and add your own — you
                are the one who knows.
              </p>
            </div>

            <ul className="flex flex-wrap gap-2">
              {feelings.map((feeling) => (
                <li key={feeling.word}>
                  <Chip
                    selected={feeling.kept}
                    icon={feeling.kept ? undefined : X}
                    onSelect={() => onToggleFeeling(feeling.word)}
                  >
                    <span>
                      {feeling.word}
                      <span className="sr-only">
                        {feeling.kept ? ' — keep this word, or turn it off' : ' — turned off, tap to keep'}
                      </span>
                    </span>
                  </Chip>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-[12rem] flex-1 space-y-1.5">
                <span className="block text-sm font-semibold tracking-tight text-ink">
                  Add a word of your own
                </span>
                <input
                  type="text"
                  value={newWord}
                  maxLength={40}
                  placeholder="However you would say it"
                  className={FIELD_CLASSES}
                  onChange={(event) => setNewWord(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    submitWord();
                  }}
                />
              </label>
              <Button
                variant="outline"
                size="md"
                leadingIcon={Plus}
                disabled={newWord.trim().length === 0}
                onClick={submitWord}
              >
                Add
              </Button>
            </div>
          </section>

          <section className="space-y-2 rounded-card bg-primary-soft px-4 py-4">
            <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
              What might be underneath
            </h3>
            <p className="text-base leading-relaxed text-ink">{outcome.underlying}</p>
          </section>

          {outcome.sentenceToSay ? (
            <section className="space-y-3 rounded-card bg-teal-soft px-4 py-4">
              <h3 className="font-display text-lg font-semibold tracking-tight text-teal-ink">
                One thing you could actually say
              </h3>
              <blockquote className="border-l-2 border-teal pl-3.5 text-lg leading-relaxed text-ink">
                {outcome.sentenceToSay}
              </blockquote>
              <p className="text-sm leading-relaxed text-ink-muted">
                Change any of it. It only works if it sounds like you.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  size="md"
                  leadingIcon={Send}
                  onClick={() => onTakeToTranslator(outcome.sentenceToSay ?? '')}
                >
                  Take this to the translator
                </Button>
                <CopyButton value={outcome.sentenceToSay} label="Copy the sentence" />
              </div>
            </section>
          ) : (
            <p className="rounded-card bg-slate-soft px-4 py-3.5 text-base leading-relaxed text-slate-ink">
              There is no sentence to hand over this time. What you described is not really
              waiting on something being said to someone else.
            </p>
          )}
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="md" leadingIcon={RotateCcw} onClick={onStartOver}>
          Start over
        </Button>
        <p className="text-sm leading-relaxed text-ink-muted">
          A starting point, not a verdict — this is reflection, not therapy or advice.
        </p>
      </div>
    </div>
  );
}
