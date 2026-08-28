import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle2,
  Compass,
  RotateCcw,
  Shuffle,
  XCircle,
} from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  DEFAULT_DECK_SEED,
  FACT_OR_GUESS_DECK,
  PATTERN_META,
  shuffleDeck,
  summariseRun,
} from './factOrGuess';
import type { CardAnswer, CardCategory, FactOrGuessCard } from './factOrGuess';

export type FactOrGuessDeckProps = {
  /** Back to the Inspect questions. The exercise never traps the user in itself. */
  onExit: () => void;
};

/**
 * The practice deck. One statement at a time, three buttons, and no advance until the user
 * presses Next — nothing in this codebase moves the screen on its own (spec §24).
 *
 * Correctness is carried by an icon **and** a text label, never by colour: the themes include
 * dark and monochrome grounds, and colour-only status fails in all of them.
 */

/** Answer buttons hold a label plus a definition line, which the shared Button truncates. */
const ANSWER_BUTTON_CLASSES = cn(
  'min-h-[4.5rem] items-start py-4 text-left',
  '[&>span]:block [&>span]:w-full [&>span]:overflow-visible [&>span]:whitespace-normal [&>span]:text-left',
);

/** A soft ground per category for the badge that names the right answer. */
const CATEGORY_TONE: Record<CardCategory, BadgeTone> = {
  fact: 'teal',
  guess: 'amber',
  feeling: 'secondary',
};

/**
 * Headings shift by category because the alternatives are doing a different job in each case: on a
 * guess they are rival explanations, on a fact they are the stories a clean fact leaves open, and
 * on a feeling they are what the feeling might be about. Same three blocks either way.
 */
const ALTERNATIVES_HEADING: Record<CardCategory, string> = {
  fact: 'The same fact still fits all of these',
  guess: 'Also consistent with what you know',
  feeling: 'What the feeling might be pointing at',
};

const BALANCED_HEADING: Record<CardCategory, string> = {
  fact: 'A read that fits all of it',
  guess: 'A read that fits all of it',
  feeling: 'What this is telling you',
};

/**
 * The second half of the exercise: sorting the statement is the diagnosis, this is the part that
 * changes anything. Three short blocks — other explanations, one balanced read, and the check that
 * would settle it — plus the name of the thinking habit where one applies.
 */
function Reframe({ card }: { card: FactOrGuessCard }): JSX.Element {
  const pattern = card.pattern ? PATTERN_META[card.pattern] : null;

  return (
    <section
      aria-label="Another way to see it"
      className="space-y-4 rounded-card border border-line bg-surface px-4 py-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
          Another way to see it
        </h3>
        {pattern ? (
          <Badge tone="slate" icon={Brain}>
            <span className="sr-only">Thinking habit: </span>
            {pattern.label}
          </Badge>
        ) : null}
      </div>

      {pattern ? (
        <p className="text-sm leading-relaxed text-ink-muted">{pattern.gloss}</p>
      ) : null}

      <div className="space-y-1.5">
        <h4 className="text-sm font-semibold tracking-tight text-ink">
          {ALTERNATIVES_HEADING[card.category]}
        </h4>
        <ul className="space-y-1.5">
          {card.alternatives.map((alternative) => (
            <li
              key={alternative}
              className="border-l-2 border-line-strong pl-3 text-base leading-relaxed text-ink-muted"
            >
              {alternative}
            </li>
          ))}
        </ul>
      </div>

      {/* The takeaway, so it gets the weight. */}
      <div className="space-y-1.5 rounded-card bg-primary-soft px-4 py-3.5">
        <h4 className="font-display text-base font-semibold tracking-tight text-ink">
          {BALANCED_HEADING[card.category]}
        </h4>
        <p className="text-lg leading-relaxed text-ink">{card.balancedThought}</p>
      </div>

      {card.howToFindOut ? (
        <div className="flex items-start gap-3 rounded-card bg-paper-sunk px-4 py-3.5">
          <Compass aria-hidden="true" className="mt-0.5 h-[18px] w-[18px] shrink-0 text-ink" />
          <p className="text-base leading-relaxed text-ink">
            <span className="font-semibold">How to find out: </span>
            {card.howToFindOut}
          </p>
        </div>
      ) : null}
    </section>
  );
}

export function FactOrGuessDeck({ onExit }: FactOrGuessDeckProps): JSX.Element {
  const [seed, setSeed] = useState(DEFAULT_DECK_SEED);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<CardCategory | null>(null);
  const [answers, setAnswers] = useState<readonly CardAnswer[]>([]);
  const [finished, setFinished] = useState(false);

  const statementRef = useRef<HTMLParagraphElement>(null);
  const verdictRef = useRef<HTMLParagraphElement>(null);
  const hasMovedRef = useRef(false);

  const order = useMemo(() => shuffleDeck(FACT_OR_GUESS_DECK, seed), [seed]);
  const card = order[index];
  const total = order.length;
  const score = answers.filter((answer) => answer.chosen === answer.actual).length;
  const isLast = index === total - 1;

  /** Keyboard users should land on the new statement, not on where the old button used to be. */
  useEffect(() => {
    if (!hasMovedRef.current) {
      hasMovedRef.current = true;
      return;
    }
    statementRef.current?.focus();
  }, [index, seed]);

  const restart = useCallback((nextSeed?: number) => {
    setIndex(0);
    setChosen(null);
    setAnswers([]);
    setFinished(false);
    if (nextSeed !== undefined) setSeed(nextSeed);
  }, []);

  /** A fixed step keeps reshuffling reproducible — no `Math.random()` anywhere in the feature. */
  const reshuffle = useCallback(() => {
    restart((seed * 31 + 17) % 2147483647);
  }, [restart, seed]);

  const answer = useCallback(
    (category: CardCategory) => {
      if (chosen !== null || card === undefined) return;
      setChosen(category);
      setAnswers((previous) => [
        ...previous,
        { cardId: card.id, chosen: category, actual: card.category },
      ]);
      // Focus the verdict so the result is read out rather than silently appearing below.
      window.requestAnimationFrame(() => verdictRef.current?.focus());
    },
    [card, chosen],
  );

  const next = useCallback(() => {
    if (isLast) {
      setFinished(true);
      return;
    }
    setChosen(null);
    setIndex((previous) => previous + 1);
  }, [isLast]);

  const header = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" leadingIcon={ArrowLeft} onClick={onExit}>
          Back to the questions
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" leadingIcon={Shuffle} onClick={reshuffle}>
            Shuffle
          </Button>
          <Button variant="ghost" size="sm" leadingIcon={RotateCcw} onClick={() => restart()}>
            Restart
          </Button>
        </div>
      </div>
      <div className="space-y-1">
        <h2 className="font-display text-2xl font-semibold leading-tight tracking-tight text-ink">
          Fact or guess?
        </h2>
        <p className="text-base leading-relaxed text-ink-muted">
          Sort each statement into what a camera would have caught, what you concluded, or what you
          felt.
        </p>
        <p className="text-sm leading-relaxed text-ink-muted">
          A thinking exercise, not therapy or treatment.
        </p>
      </div>
    </div>
  );

  // ── Summary ────────────────────────────────────────────────────────────────
  if (finished || card === undefined) {
    const summary = summariseRun(answers);

    return (
      <section aria-label="How the practice run went" className="space-y-4">
        {header}

        <Card tone="default" elevation="lift" glow className="motion-safe:animate-reveal-up">
          <CardHeader eyebrow="Practice run" title={summary.headline} />
          <CardBody className="space-y-5 py-5">
            <p className="font-mono text-lg font-semibold tabular-nums text-ink">
              {`${summary.correct} of ${summary.total} sorted the way the deck has them`}
            </p>

            {summary.topMixUp ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold tracking-tight text-ink">
                  Most common mix-up
                </span>
                <Badge tone={CATEGORY_TONE[summary.topMixUp.actual]} icon={CATEGORY_META[summary.topMixUp.actual].icon}>
                  {`${CATEGORY_META[summary.topMixUp.actual].label} called ${CATEGORY_META[summary.topMixUp.chosen].label}`}
                </Badge>
                <span className="font-mono text-sm tabular-nums text-ink-muted">
                  {`x${summary.topMixUp.count}`}
                </span>
              </div>
            ) : null}

            {summary.note ? (
              <p className="text-base leading-relaxed text-ink">{summary.note}</p>
            ) : null}

            {summary.topPattern ? (
              <section
                aria-label="The thinking habit to watch"
                className="space-y-2 rounded-card border border-line bg-paper-sunk px-4 py-4"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
                    The habit behind it
                  </h3>
                  <Badge tone="slate" icon={Brain}>
                    <span className="sr-only">Thinking habit: </span>
                    {PATTERN_META[summary.topPattern.pattern].label}
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed text-ink-muted">
                  {PATTERN_META[summary.topPattern.pattern].gloss}
                </p>
                <p className="text-sm leading-relaxed text-ink-muted">
                  {summary.topPattern.fromMistakes
                    ? `It was underneath ${summary.topPattern.count === 1 ? 'one of the cards' : `${summary.topPattern.count} of the cards`} you read differently.`
                    : 'It was the habit this deck leaned on most — you caught it every time.'}
                </p>
              </section>
            ) : null}

            <p className="rounded-card bg-primary-soft px-4 py-4 text-lg leading-relaxed text-ink">
              {summary.habit}
            </p>

            <p className="text-sm leading-relaxed text-ink-muted">
              The score is the least useful part. The habit is the part worth taking back into a
              real conversation.
            </p>

            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="md" leadingIcon={RotateCcw} onClick={() => restart()}>
                Same deck again
              </Button>
              <Button variant="outline" size="md" leadingIcon={Shuffle} onClick={reshuffle}>
                Shuffle and go again
              </Button>
              <Button variant="ghost" size="md" leadingIcon={ArrowLeft} onClick={onExit}>
                Back to the questions
              </Button>
            </div>
          </CardBody>
        </Card>
      </section>
    );
  }

  // ── One card ───────────────────────────────────────────────────────────────
  const revealed = chosen !== null;
  const isRight = revealed && chosen === card.category;
  const actualMeta = CATEGORY_META[card.category];
  const chosenMeta = chosen === null ? null : CATEGORY_META[chosen];
  const progressLabel = `Card ${index + 1} of ${total}`;
  const progress = Math.round(((index + (revealed ? 1 : 0)) / total) * 100);

  return (
    <section aria-label="Fact or guess practice" className="space-y-4">
      {header}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
          {progressLabel}
        </p>
        <p className="font-mono text-sm font-semibold tabular-nums text-ink-muted">
          {`${score} right so far`}
        </p>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-chip bg-slate-soft" role="presentation">
        <div
          className="h-full rounded-chip bg-primary transition-[width] duration-300 ease-smooth"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p aria-live="polite" className="sr-only">
        {progressLabel}
      </p>

      <Card key={card.id} tone="default" elevation="lift" className="motion-safe:animate-reveal-up">
        <CardBody className="space-y-5 py-6">
          <p
            ref={statementRef}
            tabIndex={-1}
            className="font-display text-2xl font-semibold leading-snug tracking-tight text-ink outline-none"
          >
            {card.statement}
          </p>

          <div role="group" aria-label="Is this a fact, a guess, or a feeling?" className="space-y-2.5">
            {CATEGORY_ORDER.map((category) => {
              const meta = CATEGORY_META[category];
              return (
                <Button
                  key={category}
                  variant="outline"
                  size="md"
                  fullWidth
                  leadingIcon={meta.icon}
                  aria-pressed={chosen === category}
                  disabled={revealed && chosen !== category}
                  className={cn(
                    ANSWER_BUTTON_CLASSES,
                    chosen === category && 'border-primary-ring bg-primary-soft text-ink',
                  )}
                  onClick={() => answer(category)}
                >
                  <span className="block font-display text-lg font-semibold tracking-tight">
                    {meta.label}
                  </span>
                  <span className="mt-0.5 block text-sm font-medium leading-relaxed text-ink-muted">
                    {meta.definition}
                  </span>
                </Button>
              );
            })}
          </div>

          {revealed ? (
            <div className="space-y-4 rounded-card bg-paper-sunk px-4 py-4 motion-safe:animate-reveal-up">
              {/* Icon plus words. Never colour on its own. */}
              <p
                ref={verdictRef}
                tabIndex={-1}
                className="flex flex-wrap items-center gap-x-2.5 gap-y-2 outline-none"
              >
                {isRight ? (
                  <CheckCircle2 aria-hidden="true" className="h-6 w-6 shrink-0 text-teal-ink" />
                ) : (
                  <XCircle aria-hidden="true" className="h-6 w-6 shrink-0 text-coral-ink" />
                )}
                <span className="font-display text-lg font-semibold tracking-tight text-ink">
                  {isRight ? 'Correct' : 'Not quite'}
                </span>
                <Badge tone={CATEGORY_TONE[card.category]} icon={actualMeta.icon}>
                  {`This one is a ${actualMeta.label}`}
                </Badge>
                {!isRight && chosenMeta ? (
                  <span className="text-sm font-medium text-ink-muted">
                    {`You said ${chosenMeta.label}.`}
                  </span>
                ) : null}
              </p>

              <p className="text-base leading-relaxed text-ink">{card.explanation}</p>

              {card.checkableVersion ? (
                <section className="space-y-1.5 rounded-card bg-teal-soft px-4 py-3.5">
                  <h3 className="font-display text-base font-semibold tracking-tight text-teal-ink">
                    The checkable version
                  </h3>
                  <blockquote className="border-l-2 border-teal pl-3.5 text-base leading-relaxed text-ink">
                    {card.checkableVersion}
                  </blockquote>
                </section>
              ) : null}

              <Reframe card={card} />

              <Button variant="primary" size="md" trailingIcon={ArrowRight} onClick={next}>
                {isLast ? 'See how you did' : 'Next card'}
              </Button>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <p className="text-sm leading-relaxed text-ink-muted">
        There is no wrong feeling here — only statements that belong in a different pile.
      </p>
    </section>
  );
}
