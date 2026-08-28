/**
 * Postmortem — brief §8.12.
 *
 * The nine questions, then a compact learning card: trigger, assumption, successful action,
 * failure point, better next action, recommended tool.
 *
 * Two things this screen refuses to do. It does not grade the answers — a postmortem that scores
 * you is an appraisal, not a review. And it does not let "blameless" slide into "nobody did
 * anything": the card always carries a failure point, and the failure point is allowed to be a
 * choice the user made. Blameless means the review stays usable, not that responsibility vanishes.
 *
 * The recommended tool is derived from the user's own words by keyword match and is presented as a
 * suggestion with every alternative one click away, because the user remains authoritative (§2.6).
 */

import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpenCheck,
  CircleHelp,
  Lightbulb,
  RotateCcw,
  ScrollText,
  Sparkles,
} from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, Chip, Textarea } from '@/components/ui';
import { CopyButton } from '@/components/shared';
import { featureById } from '@/features/registry';
import { cn } from '@/lib/cn';
import type { CurrentSituation, ToolId } from '@/situation/types';
import type { SituationAction } from '@/situation/reducer';

export type ToolProps = {
  situation: CurrentSituation;
  dispatch: React.Dispatch<SituationAction>;
};

type QuestionId =
  | 'happened'
  | 'expected'
  | 'actual'
  | 'thinking'
  | 'communicated'
  | 'helped'
  | 'worse'
  | 'next_time'
  | 'practice';

type Question = {
  id: QuestionId;
  /** Exact wording from brief §8.12. */
  label: string;
  hint: string;
  /** Pull the user's own earlier input forward rather than making them retype it. */
  prefill?: (situation: CurrentSituation) => string | undefined;
};

const QUESTIONS: readonly Question[] = [
  {
    id: 'happened',
    label: 'What happened?',
    hint: 'The event, not the interpretation.',
    prefill: (situation) => situation.originalEvent,
  },
  {
    id: 'expected',
    label: 'What did I expect?',
    hint: 'What you thought would happen when you sent or said it.',
    prefill: (situation) => situation.desiredOutcome,
  },
  { id: 'actual', label: 'What actually happened?', hint: 'Observable response, not motive.' },
  {
    id: 'thinking',
    label: 'What was I thinking?',
    hint: 'The thought running underneath, including the unflattering one.',
  },
  {
    id: 'communicated',
    label: 'What did I communicate?',
    hint: 'What actually left your hands — not what you meant.',
    prefill: (situation) => situation.compiledDraft ?? situation.rawOutgoingMessage,
  },
  { id: 'helped', label: 'What helped?', hint: 'Anything that made it go better, however small.' },
  { id: 'worse', label: 'What made it worse?', hint: 'Yours or theirs. Both can be true.' },
  { id: 'next_time', label: 'What will I try next time?', hint: 'One specific action, not a resolution.' },
  { id: 'practice', label: 'Which skill should I practice?', hint: 'Name the skill in your own words.' },
];

const EMPTY_ANSWERS: Record<QuestionId, string> = {
  happened: '',
  expected: '',
  actual: '',
  thinking: '',
  communicated: '',
  helped: '',
  worse: '',
  next_time: '',
  practice: '',
};

/** Keyword routes, checked in order. First match wins; everything else falls through to the default. */
const TOOL_ROUTES: ReadonlyArray<{ tool: ToolId; pattern: RegExp }> = [
  { tool: 'patch', pattern: /\b(already sent|sent it|apolog|repair|damage|regret|take (it )?back)\b/i },
  { tool: 'breakpoint', pattern: /\b(snapped|reacted|escalat|blew up|immediately|too fast|heat of)\b/i },
  { tool: 'thought_debugger', pattern: /\b(assum|thought they|figured they|must have|mind|motive|read into)\b/i },
  { tool: 'signal_decoder', pattern: /\b(what (they|he|she) meant|tone of their|their message|ambigu|unclear reply)\b/i },
  { tool: 'conflict_trace', pattern: /\b(argument|fight|both of us|went in circles|forked|off topic)\b/i },
  { tool: 'state_inspector', pattern: /\b(did ?n[o']?t know what I felt|overwhelm|shut down|numb|body|tight chest)\b/i },
  { tool: 'message_compiler', pattern: /\b(wording|phras|draft|rewrite|how I said|too long|rambl)\b/i },
  { tool: 'unit_tests', pattern: /\b(check|test|before sending|proofread|missed a step)\b/i },
];

const DEFAULT_TOOL: ToolId = 'message_compiler';

function recommendTool(answers: Record<QuestionId, string>): ToolId {
  const corpus = `${answers.practice} ${answers.next_time} ${answers.worse} ${answers.thinking}`;
  const match = TOOL_ROUTES.find((route) => route.pattern.test(corpus));
  return match?.tool ?? DEFAULT_TOOL;
}

/** First sentence, trimmed — keeps the card compact without editorialising the user's words. */
function firstSentence(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) return '';
  const match = trimmed.match(/^[^.!?\n]{1,200}[.!?]?/);
  return (match ? match[0] : trimmed.slice(0, 200)).trim();
}

const NOT_ANSWERED = 'Not answered.';

function orPlaceholder(text: string): string {
  const value = firstSentence(text);
  return value.length > 0 ? value : NOT_ANSWERED;
}

type CardField = { id: string; label: string; value: string; tone: 'teal' | 'amber' | 'coral' | 'primary' };

const FIELD_TONE: Record<CardField['tone'], string> = {
  teal: 'border-teal/30 bg-teal-soft',
  amber: 'border-amber/30 bg-amber-soft',
  coral: 'border-coral/30 bg-coral-soft',
  primary: 'border-primary/25 bg-primary-soft',
};

export function Postmortem({
  situation,
  dispatch,
  onOpenTool,
}: ToolProps & { onOpenTool: (t: ToolId) => void }): JSX.Element {
  const [answers, setAnswers] = useState<Record<QuestionId, string>>(() => {
    const seeded = { ...EMPTY_ANSWERS };
    QUESTIONS.forEach((question) => {
      const prefilled = question.prefill?.(situation);
      if (prefilled) seeded[question.id] = prefilled;
    });
    return seeded;
  });
  const [cardAnswers, setCardAnswers] = useState<Record<QuestionId, string> | null>(null);
  const [chosenTool, setChosenTool] = useState<ToolId | null>(null);

  const answeredCount = useMemo(
    () => QUESTIONS.filter((question) => answers[question.id].trim().length > 0).length,
    [answers],
  );

  const humorAllowed =
    situation.safety.humorAllowed && !situation.safety.seriousMode && situation.humorLevel !== 'off';

  const recommended = cardAnswers ? (chosenTool ?? recommendTool(cardAnswers)) : DEFAULT_TOOL;
  const recommendedFeature = featureById(recommended);

  const fields: CardField[] = cardAnswers
    ? [
        { id: 'trigger', label: 'Trigger', value: orPlaceholder(cardAnswers.happened), tone: 'primary' },
        { id: 'assumption', label: 'Assumption', value: orPlaceholder(cardAnswers.thinking), tone: 'amber' },
        { id: 'successful', label: 'Successful action', value: orPlaceholder(cardAnswers.helped), tone: 'teal' },
        { id: 'failure', label: 'Failure point', value: orPlaceholder(cardAnswers.worse), tone: 'coral' },
        { id: 'better', label: 'Better next action', value: orPlaceholder(cardAnswers.next_time), tone: 'teal' },
      ]
    : [];

  const expectationShift = cardAnswers
    ? {
        expected: orPlaceholder(cardAnswers.expected),
        actual: orPlaceholder(cardAnswers.actual),
        changed:
          cardAnswers.expected.trim().length > 0 &&
          cardAnswers.actual.trim().length > 0 &&
          firstSentence(cardAnswers.expected).toLowerCase() !==
            firstSentence(cardAnswers.actual).toLowerCase(),
      }
    : null;

  const cardText = cardAnswers
    ? [
        `POSTMORTEM — ${situation.title}`,
        ...fields.map((field) => `${field.label}: ${field.value}`),
        `Recommended tool: ${recommendedFeature.name}`,
      ].join('\n')
    : '';

  function generate(): void {
    setCardAnswers({ ...answers });
    setChosenTool(null);
    dispatch({ type: 'mark_tool', tool: 'postmortem', status: 'complete' });
  }

  return (
    <section className="flex flex-col gap-5" aria-labelledby="postmortem-heading">
      <Card tone="primary">
        <CardBody className="flex flex-col gap-3">
          <p className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
            patterns · postmortem
          </p>
          <h2
            id="postmortem-heading"
            className="font-display text-display-sm font-semibold tracking-tight text-ink"
          >
            Review the interaction, not the person
          </h2>
          <p className="max-w-2xl text-base leading-relaxed text-ink">
            Nine questions. Answer the ones you can — the card is built from whatever you fill in.
            Nothing here is graded and nothing is stored.
          </p>
          {humorAllowed ? (
            <p className="text-sm italic leading-relaxed text-ink-muted">
              Blameless means useful. It does not mean pretending nobody had responsibility.
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          eyebrow="review.questions"
          title="The nine questions"
          icon={CircleHelp}
          actions={
            <Badge tone={answeredCount >= 4 ? 'teal' : 'slate'}>
              {answeredCount} of {QUESTIONS.length} answered
            </Badge>
          }
        />
        <CardBody className="grid gap-4 md:grid-cols-2">
          {QUESTIONS.map((question) => (
            <Textarea
              key={question.id}
              label={question.label}
              hint={question.hint}
              rows={3}
              value={answers[question.id]}
              onChange={(event) =>
                setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
              }
            />
          ))}
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          leadingIcon={Sparkles}
          disabled={answeredCount < 3}
          onClick={generate}
          size="lg"
        >
          {cardAnswers ? 'Rebuild learning card' : 'Build learning card'}
        </Button>
        {answeredCount < 3 ? (
          <p className="text-sm text-ink-muted">Answer at least three questions to build the card.</p>
        ) : null}
        {cardAnswers ? (
          <Button
            variant="ghost"
            leadingIcon={RotateCcw}
            onClick={() => {
              setAnswers({ ...EMPTY_ANSWERS });
              setCardAnswers(null);
              setChosenTool(null);
            }}
          >
            Start over
          </Button>
        ) : null}
      </div>

      {cardAnswers ? (
        <Card glow className="motion-safe:animate-reveal-up">
          <CardHeader
            eyebrow="learning.card"
            title={situation.title}
            icon={ScrollText}
            actions={<CopyButton value={cardText} label="Copy card" size="sm" />}
          />
          <CardBody className="flex flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              {fields.map((field) => (
                <div
                  key={field.id}
                  className={cn('rounded-card border px-4 py-3', FIELD_TONE[field.tone])}
                >
                  <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    {field.label}
                  </p>
                  <p
                    className={cn(
                      'mt-1 text-base leading-relaxed text-ink',
                      field.value === NOT_ANSWERED && 'italic text-ink-muted',
                    )}
                  >
                    {field.value}
                  </p>
                </div>
              ))}
            </div>

            {expectationShift ? (
              <div className="rounded-card border border-line bg-paper-sunk px-4 py-3">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  where your understanding changed
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <p className="flex-1 text-sm leading-relaxed text-ink">
                    <span className="font-semibold">Expected: </span>
                    {expectationShift.expected}
                  </p>
                  <ArrowRight aria-hidden="true" className="hidden h-4 w-4 shrink-0 text-ink-muted sm:block" />
                  <p className="flex-1 text-sm leading-relaxed text-ink">
                    <span className="font-semibold">Actual: </span>
                    {expectationShift.actual}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {expectationShift.changed
                    ? 'Your expectation and the outcome are not the same sentence. That gap is the part worth practicing.'
                    : 'Nothing recorded here diverged. The gap, if there was one, was somewhere else.'}
                </p>
              </div>
            ) : null}

            <div className="rounded-card border border-primary/25 bg-primary-soft px-4 py-3">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                recommended tool
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Badge tone="primary" icon={Lightbulb} size="md">
                  {recommendedFeature.name}
                </Badge>
                <p className="min-w-0 flex-1 text-sm leading-relaxed text-ink">
                  {recommendedFeature.summary}
                </p>
                <Button
                  leadingIcon={BookOpenCheck}
                  onClick={() => onOpenTool(recommended)}
                >
                  Practice this
                </Button>
              </div>
              <p className="mt-3 text-sm text-ink-muted">
                Matched from your own wording. Pick a different one if it is wrong:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {TOOL_ROUTES.map((route) => {
                  const feature = featureById(route.tool);
                  return (
                    <Chip
                      key={route.tool}
                      selected={recommended === route.tool}
                      icon={feature.icon}
                      onSelect={() => setChosenTool(route.tool)}
                    >
                      {feature.name}
                    </Chip>
                  );
                })}
              </div>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </section>
  );
}
