/**
 * State Inspector — brief §8.2, content model from the practice spec §8.1 "System Status".
 *
 * Four expandable diagnostic modules: current operating condition, intensity, body signals,
 * default response. The point of the screen is not the vocabulary list; it is that the app never
 * decides how you feel. Every machine-produced state arrives as a question with four answers
 * (see `FeelingConfirmation`), and the runtime readout at the top moves only when a confirmed
 * selection changes.
 *
 * Deliberately absent: any inference from camera, microphone, typing speed, or biometrics. The
 * readout says so on screen, because a "live status" visualisation invites exactly that suspicion.
 */

import { useEffect, useId, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  ChevronDown,
  CircleCheck,
  CircleDashed,
  Gauge,
  HeartPulse,
  Plus,
  ScanLine,
  ShieldOff,
  Target,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, Chip, Textarea } from '@/components/ui';
import { featureById } from '@/features/registry';
import { cn } from '@/lib/cn';
import type { CurrentSituation, ToolId } from '@/situation/types';
import type { SituationAction } from '@/situation/reducer';
import { FeelingConfirmation } from './FeelingConfirmation';

export type ToolProps = {
  situation: CurrentSituation;
  dispatch: React.Dispatch<SituationAction>;
};

/* ── Vocabulary (brief §8.2, exact lists) ────────────────────────────────── */

const FEELINGS = [
  'Irritated',
  'Defensive',
  'Anxious',
  'Embarrassed',
  'Overloaded',
  'Dismissed',
  'Hurt',
  'Confused',
  'Shut down',
  'I do not know',
] as const;

const ACTION_URGES = [
  'Defend',
  'Fix',
  'Prove',
  'Withdraw',
  'Attack',
  'Apologize immediately',
  'Shut down',
  'Ask',
  'Pause',
] as const;

/** Optional (practice spec §8.1 question 4). "Nothing I notice" is a real, valid answer. */
const BODY_SIGNALS = [
  'Tight jaw',
  'Tight chest',
  'Stomach',
  'Shoulders up',
  'Hands or fists',
  'Throat',
  'Hot face',
  'Fast breathing',
  'Nothing I notice',
] as const;

const NO_SIGNAL = 'Nothing I notice';

const INTENSITY_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Barely registering',
  2: 'Noticeable',
  3: 'Running in the background',
  4: 'Loud',
  5: 'Driving the decision',
};

/* ── Suggestion pass ─────────────────────────────────────────────────────── */

/**
 * Cue matching over the words the user already typed. This is a text match and nothing more —
 * it is presented as a question precisely because it is shallow.
 */
const FEELING_CUES: ReadonlyArray<{ feeling: string; cues: readonly string[] }> = [
  { feeling: 'Irritated', cues: ['again', 'still not', 'seriously', 'annoy', 'why do i have to'] },
  {
    feeling: 'Defensive',
    cues: ['i already', 'i did', 'actually', 'i told', 'not my fault', 'you never', 'you always'],
  },
  { feeling: 'Anxious', cues: ['what if', 'worried', 'nervous', 'deadline', 'behind', 'late'] },
  { feeling: 'Embarrassed', cues: ['forgot', 'my fault', 'should have', 'in front of', 'everyone saw'] },
  { feeling: 'Overloaded', cues: ['everything', 'too much', 'no time', 'all day', 'another thing'] },
  { feeling: 'Dismissed', cues: ['ignored', 'no one', 'nobody', 'never listens', 'did not even'] },
  { feeling: 'Hurt', cues: ['hurt', 'does not care', 'unfair', 'after everything'] },
  { feeling: 'Confused', cues: ['not sure', 'do not understand', 'unclear', 'confus', 'what does'] },
  { feeling: 'Shut down', cues: ['whatever', 'over it', 'done talking', 'forget it'] },
];

const MAX_SUGGESTIONS = 3;

function readableText(situation: CurrentSituation): string {
  return [situation.originalEvent, situation.incomingMessage, situation.rawOutgoingMessage]
    .filter((part): part is string => Boolean(part?.trim()))
    .join('\n')
    .toLowerCase();
}

function suggestFeelings(situation: CurrentSituation): string[] {
  const haystack = readableText(situation);
  if (haystack.length === 0) return [];
  return FEELING_CUES.filter(({ cues }) => cues.some((cue) => haystack.includes(cue)))
    .map(({ feeling }) => feeling)
    .slice(0, MAX_SUGGESTIONS);
}

/* ── Next-tool routing ───────────────────────────────────────────────────── */

const HOT_URGES: ReadonlySet<string> = new Set(['Defend', 'Attack', 'Prove', 'Apologize immediately']);

function recommendNext(situation: CurrentSituation): { tool: ToolId; reason: string } {
  if ((situation.intensity ?? 0) >= 4) {
    return {
      tool: 'breakpoint',
      reason: 'You put this at 4 or 5. Nothing decided at that level tends to survive review.',
    };
  }
  if (situation.actionUrge && HOT_URGES.has(situation.actionUrge)) {
    return {
      tool: 'thought_debugger',
      reason: `"${situation.actionUrge}" is usually answering a thought. Worth checking what the thought is claiming.`,
    };
  }
  if (situation.rawOutgoingMessage?.trim() || situation.compiledDraft?.trim()) {
    return { tool: 'message_compiler', reason: 'You already have words. They need a pass, not a rewrite.' };
  }
  return {
    tool: 'stack_trace',
    reason: 'The state is logged. Next question is how it got here.',
  };
}

/* ── Expandable module shell ─────────────────────────────────────────────── */

type ModuleProps = {
  step: string;
  title: string;
  icon: LucideIcon;
  question: string;
  /** Short text answer shown collapsed. Never colour-only: this text carries the status. */
  answer: string;
  settled: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

function Module({
  step,
  title,
  icon: Icon,
  question,
  answer,
  settled,
  open,
  onToggle,
  children,
}: ModuleProps): JSX.Element {
  const panelId = useId();
  const headingId = `${panelId}-heading`;

  return (
    <Card tone={settled ? 'teal' : 'default'} elevation="card" className="overflow-hidden">
      <h3 id={headingId}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-h-tap w-full items-center gap-3 px-5 py-4 text-left transition-colors duration-150 hover:bg-primary-soft"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary-soft text-primary"
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
              {`Module ${step}`}
            </span>
            <span className="block font-display text-lg font-semibold leading-tight tracking-tight text-ink">
              {title}
            </span>
            <span className="mt-0.5 block truncate text-sm text-ink-muted">{answer}</span>
          </span>
          <Badge
            tone={settled ? 'teal' : 'slate'}
            icon={settled ? CircleCheck : CircleDashed}
            size="sm"
            className={settled ? 'border-solid' : 'border-dotted'}
          >
            {settled ? 'Logged' : 'Empty'}
          </Badge>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'h-5 w-5 shrink-0 text-ink-muted transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </button>
      </h3>
      <div id={panelId} role="region" aria-labelledby={headingId} hidden={!open}>
        <CardBody className="border-t border-line/80">
          <p className="mb-3 text-base leading-relaxed text-ink-muted">{question}</p>
          {children}
        </CardBody>
      </div>
    </Card>
  );
}

/* ── Runtime readout (brief §8.2 "Technical flourish") ───────────────────── */

type ReadoutRowProps = { label: string; value: string; filled: number; total: number };

function ReadoutRow({ label, value, filled, total }: ReadoutRowProps): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="w-28 shrink-0 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </span>
      <span aria-hidden="true" className="flex shrink-0 gap-1">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={cn(
              'h-2.5 w-5 rounded-sm border transition-colors duration-200',
              index < filled ? 'border-transparent bg-grad-primary' : 'border-line-strong bg-paper-sunk',
            )}
          />
        ))}
      </span>
      {/* The text is the status. The bars are decoration on top of it. */}
      <span className="min-w-0 flex-1 text-sm font-semibold tracking-tight text-ink">{value}</span>
    </div>
  );
}

/* ── Screen ──────────────────────────────────────────────────────────────── */

export function StateInspector({ situation, dispatch }: ToolProps): JSX.Element {
  const [open, setOpen] = useState<Record<string, boolean>>({ condition: true });
  const [ownFeeling, setOwnFeeling] = useState('');
  const [suggested, setSuggested] = useState(false);

  const humorOn = !situation.safety.seriousMode && situation.humorLevel !== 'off';

  const confirmed = situation.feelings.filter((claim) => claim.state === 'confirmed');
  const awaiting = situation.feelings.filter((claim) => claim.state === 'suggested');
  const answered = situation.feelings.filter((claim) => claim.state !== 'suggested');

  const hasText = readableText(situation).length > 0;
  const candidates = useMemo(() => suggestFeelings(situation), [situation]);

  const settled = {
    condition: confirmed.length > 0,
    intensity: situation.intensity !== undefined,
    body: situation.bodySignals.length > 0,
    response: Boolean(situation.actionUrge),
  };
  const settledCount = Object.values(settled).filter(Boolean).length;
  const ready = settled.condition && settled.intensity;

  const next = recommendNext(situation);
  const nextFeature = featureById(next.tool);

  // Record progress on the shared trace once the two load-bearing modules are answered, and
  // flag the routed tool as recommended so every other surface shows the same next step.
  useEffect(() => {
    if (!ready) return;
    dispatch({ type: 'mark_tool', tool: 'state_inspector', status: 'complete' });
    dispatch({ type: 'mark_tool', tool: next.tool, status: 'recommended' });
  }, [ready, next.tool, dispatch]);

  const toggle = (key: string): void =>
    setOpen((current) => ({ ...current, [key]: !(current[key] ?? false) }));

  const runSuggestions = (): void => {
    setSuggested(true);
    if (candidates.length > 0) {
      dispatch({ type: 'suggest_claims', kind: 'feelings', texts: candidates, source: 'state_inspector' });
    }
  };

  const addOwn = (): void => {
    const trimmed = ownFeeling.trim();
    if (trimmed.length === 0) return;
    dispatch({ type: 'add_user_claim', kind: 'feelings', text: trimmed });
    setOwnFeeling('');
  };

  const pickFeeling = (feeling: string): void => {
    const existing = situation.feelings.find(
      (claim) => claim.text.toLowerCase() === feeling.toLowerCase(),
    );
    if (existing) {
      dispatch({
        type: 'set_claim_state',
        kind: 'feelings',
        id: existing.id,
        state: existing.state === 'confirmed' ? 'rejected' : 'confirmed',
      });
      return;
    }
    dispatch({ type: 'add_user_claim', kind: 'feelings', text: feeling });
  };

  const toggleSignal = (signal: string): void => {
    const active = situation.bodySignals.includes(signal);
    if (signal === NO_SIGNAL) {
      dispatch({ type: 'set_body_signals', signals: active ? [] : [NO_SIGNAL] });
      return;
    }
    const withoutNone = situation.bodySignals.filter((entry) => entry !== NO_SIGNAL);
    dispatch({
      type: 'set_body_signals',
      signals: active ? withoutNone.filter((entry) => entry !== signal) : [...withoutNone, signal],
    });
  };

  const confirmedLabel = confirmed.map((claim) => claim.userWording ?? claim.text).join(', ');

  return (
    <section aria-labelledby="state-inspector-heading" className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
          Inspect
        </p>
        <h2
          id="state-inspector-heading"
          className="font-display text-display-sm font-semibold tracking-tight text-ink"
        >
          State Inspector
        </h2>
        <p className="max-w-2xl text-base leading-relaxed text-ink-muted">
          Read the current state before deciding what to do about it. Nothing here is settled until
          you say it is.
        </p>
        {humorOn ? (
          <p className="max-w-2xl font-mono text-sm leading-relaxed text-ink-muted">
            You can start with the bug report. Feelings vocabulary is optional.
          </p>
        ) : null}
      </header>

      {/* Runtime readout — moves only when a confirmed selection changes. */}
      <Card tone="sunk" elevation="flat">
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Activity aria-hidden="true" className="h-[18px] w-[18px] text-primary" />
            <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Runtime status
            </h3>
          </div>
          <ReadoutRow
            label="Modules"
            value={`${settledCount} of 4 confirmed`}
            filled={settledCount}
            total={4}
          />
          <ReadoutRow
            label="Load"
            value={
              situation.intensity
                ? `${situation.intensity} of 5 — ${INTENSITY_LABELS[situation.intensity]}`
                : 'Not reported'
            }
            filled={situation.intensity ?? 0}
            total={5}
          />
          <p className="flex items-start gap-1.5 text-sm leading-relaxed text-ink-muted">
            <ShieldOff aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Derived only from selections you confirmed. No camera, microphone, typing speed, or
              biometric signal is read — this app has no access to any of them and does not ask.
            </span>
          </p>
        </CardBody>
      </Card>

      {/* Module 1 — current operating condition */}
      <Module
        step="1"
        title="Current operating condition"
        icon={ScanLine}
        question="What is running right now? Pick from the list, answer the suggestions, or write your own."
        answer={confirmed.length > 0 ? confirmedLabel : 'Nothing confirmed yet'}
        settled={settled.condition}
        open={open.condition ?? false}
        onToggle={() => toggle('condition')}
      >
        <div className="flex flex-col gap-4">
          {!hasText ? (
            <Textarea
              label="What happened?"
              hint="A sentence is enough. It stays in this session and is never sent anywhere on its own."
              rows={3}
              value={situation.originalEvent ?? ''}
              onChange={(event) =>
                dispatch({ type: 'set_text', patch: { originalEvent: event.target.value } })
              }
            />
          ) : null}

          {!suggested && awaiting.length === 0 ? (
            <div className="flex flex-col gap-2">
              <Button
                variant="secondary"
                leadingIcon={ScanLine}
                disabled={!hasText}
                onClick={runSuggestions}
              >
                Read my words and suggest states
              </Button>
              <p className="text-sm leading-relaxed text-ink-muted">
                {hasText
                  ? 'This matches wording, not mood. Whatever comes back is a question with four answers.'
                  : 'Write what happened first, or skip the suggestions and pick from the list below.'}
              </p>
            </div>
          ) : null}

          {suggested && candidates.length === 0 && awaiting.length === 0 ? (
            <p className="rounded-card border border-line bg-paper-sunk p-3 text-base leading-relaxed text-ink">
              Nothing in your wording matched a state clearly. That is a limit of the match, not a
              statement about you. Pick from the list, or write your own.
            </p>
          ) : null}

          {situation.feelings.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {[...awaiting, ...answered].map((claim) => (
                <FeelingConfirmation
                  key={claim.id}
                  claim={claim}
                  noun="state"
                  onSetState={(state) =>
                    dispatch({ type: 'set_claim_state', kind: 'feelings', id: claim.id, state })
                  }
                  onSetWording={(wording) =>
                    dispatch({ type: 'set_claim_wording', kind: 'feelings', id: claim.id, wording })
                  }
                />
              ))}
            </ul>
          ) : null}

          <fieldset className="flex flex-col gap-2">
            <legend className="text-base font-semibold tracking-tight text-ink">
              Or pick one directly
            </legend>
            <div className="flex flex-wrap gap-2">
              {FEELINGS.map((feeling) => {
                const claim = situation.feelings.find(
                  (entry) => entry.text.toLowerCase() === feeling.toLowerCase(),
                );
                return (
                  <Chip
                    key={feeling}
                    selected={claim?.state === 'confirmed'}
                    onSelect={() => pickFeeling(feeling)}
                  >
                    {feeling}
                  </Chip>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <Textarea
              label="Write your own"
              hint="Anything you type here is recorded as confirmed, because you wrote it."
              rows={2}
              value={ownFeeling}
              onChange={(event) => setOwnFeeling(event.target.value)}
            />
            <div>
              <Button
                variant="outline"
                leadingIcon={Plus}
                disabled={ownFeeling.trim().length === 0}
                onClick={addOwn}
              >
                Add this state
              </Button>
            </div>
          </div>
        </div>
      </Module>

      {/* Module 2 — intensity */}
      <Module
        step="2"
        title="Intensity"
        icon={Gauge}
        question="How loud is it, from 1 to 5?"
        answer={
          situation.intensity
            ? `${situation.intensity} of 5 — ${INTENSITY_LABELS[situation.intensity]}`
            : 'Not reported'
        }
        settled={settled.intensity}
        open={open.intensity ?? false}
        onToggle={() => toggle('intensity')}
      >
        {/*
          Toggle buttons in a group rather than an ARIA radiogroup: each control is individually
          tab-reachable, which is what actually happens here. Claiming `radiogroup` would promise
          arrow-key roving that these buttons do not implement.
        */}
        <div role="group" aria-label="Intensity from 1 to 5" className="flex flex-wrap gap-2">
          {([1, 2, 3, 4, 5] as const).map((level) => {
            const active = situation.intensity === level;
            return (
              <button
                key={level}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  dispatch({ type: 'set_intensity', intensity: active ? undefined : level })
                }
                className={cn(
                  'flex min-h-tap min-w-[7.5rem] flex-col items-start gap-0.5 rounded-card border px-4 py-2.5 text-left shadow-card',
                  'transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-spring',
                  'motion-safe:hover:-translate-y-0.5',
                  active
                    ? 'border-transparent bg-grad-primary text-surface shadow-glow-primary'
                    : 'border-line-strong bg-surface text-ink hover:border-primary-ring hover:bg-primary-soft',
                )}
              >
                <span className="font-mono text-lg font-bold leading-none">{level}</span>
                <span className="text-sm font-semibold leading-tight">
                  {INTENSITY_LABELS[level]}
                </span>
              </button>
            );
          })}
        </div>
      </Module>

      {/* Module 3 — body signals */}
      <Module
        step="3"
        title="Body signals"
        icon={HeartPulse}
        question="Where do you notice it physically? Optional — skipping it is a valid answer."
        answer={situation.bodySignals.length > 0 ? situation.bodySignals.join(', ') : 'Not reported'}
        settled={settled.body}
        open={open.body ?? false}
        onToggle={() => toggle('body')}
      >
        <fieldset>
          <legend className="sr-only">Body signals</legend>
          <div className="flex flex-wrap gap-2">
            {BODY_SIGNALS.map((signal) => (
              <Chip
                key={signal}
                selected={situation.bodySignals.includes(signal)}
                onSelect={() => toggleSignal(signal)}
              >
                {signal}
              </Chip>
            ))}
          </div>
        </fieldset>
      </Module>

      {/* Module 4 — default response */}
      <Module
        step="4"
        title="Default response"
        icon={Zap}
        question="What do you feel like doing, and what do you actually want to happen?"
        answer={situation.actionUrge ? `Urge: ${situation.actionUrge}` : 'Not reported'}
        settled={settled.response}
        open={open.response ?? false}
        onToggle={() => toggle('response')}
      >
        <div className="flex flex-col gap-4">
          <fieldset>
            <legend className="text-base font-semibold tracking-tight text-ink">
              The urge
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {ACTION_URGES.map((urge) => (
                <Chip
                  key={urge}
                  selected={situation.actionUrge === urge}
                  onSelect={() =>
                    dispatch({
                      type: 'set_action_urge',
                      urge: situation.actionUrge === urge ? undefined : urge,
                    })
                  }
                >
                  {urge}
                </Chip>
              ))}
            </div>
          </fieldset>

          <Textarea
            label="What outcome do you actually want?"
            hint="Not what you want to say. What you want to be true afterwards."
            rows={2}
            value={situation.desiredOutcome ?? ''}
            onChange={(event) =>
              dispatch({ type: 'set_text', patch: { desiredOutcome: event.target.value } })
            }
          />
        </div>
      </Module>

      {/* Result */}
      <Card tone={ready ? 'primary' : 'default'} elevation="lift" glow={ready}>
        <CardHeader
          eyebrow="Result"
          title="Inspection report"
          icon={Target}
          actions={
            <Badge
              tone={ready ? 'teal' : 'slate'}
              icon={ready ? CircleCheck : CircleDashed}
              className={ready ? 'border-solid' : 'border-dotted'}
            >
              {ready ? 'Ready' : 'Incomplete'}
            </Badge>
          }
        />
        <CardBody className="flex flex-col gap-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Confirmed state
              </dt>
              <dd className="mt-1 text-base leading-relaxed text-ink">
                {confirmed.length > 0 ? confirmedLabel : 'Nothing confirmed yet.'}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Possible state, awaiting confirmation
              </dt>
              <dd className="mt-1 text-base leading-relaxed text-ink">
                {awaiting.length > 0
                  ? `${awaiting.map((claim) => claim.text).join(', ')} — unconfirmed, so it counts for nothing yet.`
                  : 'Nothing waiting on you.'}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Intensity
              </dt>
              <dd className="mt-1 text-base leading-relaxed text-ink">
                {situation.intensity
                  ? `${situation.intensity} of 5 — ${INTENSITY_LABELS[situation.intensity]}`
                  : 'Not reported.'}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Action urge
              </dt>
              <dd className="mt-1 text-base leading-relaxed text-ink">
                {situation.actionUrge ?? 'Not reported.'}
                {situation.bodySignals.length > 0 ? ` · Body: ${situation.bodySignals.join(', ')}` : ''}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Desired outcome
              </dt>
              <dd className="mt-1 text-base leading-relaxed text-ink">
                {situation.desiredOutcome?.trim() || 'Not reported.'}
              </dd>
            </div>
          </dl>

          <div className="rounded-card border border-line bg-surface p-4">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Recommended next tool
            </p>
            <p className="mt-1 text-base leading-relaxed text-ink">{next.reason}</p>
            <Button
              className="mt-3"
              variant="primary"
              leadingIcon={nextFeature.icon}
              trailingIcon={ArrowRight}
              onClick={() =>
                dispatch({
                  type: 'open_tool',
                  tool: nextFeature.id,
                  workspace: nextFeature.workspace,
                })
              }
            >
              {`Open ${nextFeature.name}`}
            </Button>
          </div>
        </CardBody>
      </Card>
    </section>
  );
}
