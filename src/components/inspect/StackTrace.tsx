/**
 * Stack Trace — brief §8.4, content model from the practice spec §8.2 "Incident Trace".
 *
 * Six frames from situation to relationship impact, read out of the shared Current Situation
 * rather than re-asked. Two things the screen refuses to blur:
 *
 *   1. Every frame states whether it is confirmed or inferred, in words. Frame six is always
 *      inferred, because nobody has reported what actually happened.
 *   2. Editing a frame does not silently rewrite history. The trace captured on arrival is kept
 *      and can be shown next to the current one, and every frame after an edit is flagged as
 *      sitting downstream of that edit.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Braces,
  History,
  Layers,
  MessageSquare,
  Radio,
  Users,
  Zap,
} from 'lucide-react';
import { Badge, Button, Card, CardBody } from '@/components/ui';
import { featureById } from '@/features/registry';
import type { CurrentSituation, ToolId } from '@/situation/types';
import type { SituationAction } from '@/situation/reducer';
import { TraceFrame } from './TraceFrame';
import type { TraceFrameData } from './TraceFrame';

type StackTraceProps = {
  situation: CurrentSituation;
  dispatch: React.Dispatch<SituationAction>;
  onOpenTool: (tool: ToolId) => void;
};

/** §15: 180–300ms per stage. */
const STAGE_MS = 180;

const HOT_URGES: ReadonlySet<string> = new Set(['Defend', 'Attack', 'Prove', 'Withdraw', 'Shut down']);

function feelingLine(situation: CurrentSituation): string {
  const confirmed = situation.feelings
    .filter((claim) => claim.state === 'confirmed')
    .map((claim) => claim.userWording ?? claim.text);
  const parts: string[] = [];
  if (confirmed.length > 0) parts.push(confirmed.join(', '));
  if (situation.intensity) parts.push(`intensity ${situation.intensity} of 5`);
  if (situation.bodySignals.length > 0) parts.push(situation.bodySignals.join(', '));
  return parts.join(' · ');
}

function messageLine(situation: CurrentSituation): string {
  return (situation.compiledDraft ?? situation.rawOutgoingMessage ?? '').trim();
}

function impactLine(situation: CurrentSituation): string {
  const message = messageLine(situation);
  if (message.length === 0) {
    return 'Nothing has been sent, so there is no impact yet. This is the cheapest point in the trace to change.';
  }
  if (situation.actionUrge && HOT_URGES.has(situation.actionUrge)) {
    return `Likely to be read as a counter-move rather than an answer. The thing ${situation.roles.recipient.toLowerCase()} raised stays open, and a second thing joins it.`;
  }
  return `Likely to be read as a reply to what ${situation.roles.recipient.toLowerCase()} raised. The original topic is still the topic.`;
}

/** The six frame values, in order — the shape the original-vs-current comparison runs over. */
function frameValues(situation: CurrentSituation): string[] {
  const thought = situation.assumptions[0];
  return [
    (situation.originalEvent ?? '').trim(),
    (thought ? (thought.userWording ?? thought.text) : '').trim(),
    feelingLine(situation),
    (situation.actionUrge ?? '').trim(),
    messageLine(situation),
    impactLine(situation),
  ];
}

export function StackTrace({ situation, dispatch, onOpenTool }: StackTraceProps): JSX.Element {
  // Captured once, on arrival. This is the "before" the brief asks to preserve for comparison.
  const [baseline] = useState<string[]>(() => frameValues(situation));
  const [showOriginal, setShowOriginal] = useState(false);

  const humorOn = !situation.safety.seriousMode && situation.humorLevel !== 'off';

  const current = useMemo(() => frameValues(situation), [situation]);
  const firstChanged = current.findIndex((value, index) => value !== baseline[index]);
  const hasEdits = firstChanged !== -1;

  const thoughtClaim = situation.assumptions[0];
  const confirmedFeelings = situation.feelings.filter((claim) => claim.state === 'confirmed');
  const message = messageLine(situation);

  const frames: TraceFrameData[] = [
    {
      id: 'situation',
      label: 'Situation',
      icon: Radio,
      value: current[0],
      confirmed: current[0].length > 0,
      source: current[0].length > 0 ? 'You typed this.' : 'Not captured yet.',
      downstream: 'Everything after this frame is a reaction to it.',
      inspectTool: 'context_switch',
      editLabel: 'What actually happened?',
      onEdit: (next) => dispatch({ type: 'set_text', patch: { originalEvent: next } }),
    },
    {
      id: 'thought',
      label: 'Automatic thought',
      icon: Braces,
      value: current[1],
      confirmed: thoughtClaim?.state === 'confirmed',
      source: thoughtClaim
        ? thoughtClaim.source
          ? `Suggested by ${featureById(thoughtClaim.source).name}, ${thoughtClaim.state === 'confirmed' ? 'confirmed by you' : 'not yet confirmed'}.`
          : 'You wrote this.'
        : 'Not captured yet. Thought Debugger records it.',
      downstream: 'Sets the feeling, and through it the urge.',
      inspectTool: 'thought_debugger',
      editLabel: 'The thought that keeps showing up',
      onEdit: (next) => {
        if (thoughtClaim) {
          dispatch({
            type: 'set_claim_wording',
            kind: 'assumptions',
            id: thoughtClaim.id,
            wording: next,
          });
          return;
        }
        dispatch({ type: 'add_user_claim', kind: 'assumptions', text: next });
      },
    },
    {
      id: 'feeling',
      label: 'Feeling and body response',
      icon: Activity,
      value: current[2],
      confirmed: confirmedFeelings.length > 0,
      source:
        confirmedFeelings.length > 0
          ? 'Confirmed by you in State Inspector.'
          : 'Nothing confirmed. Suggestions do not count here.',
      downstream: 'Sets which response feels obvious.',
      inspectTool: 'state_inspector',
      editLabel: 'Describe the state in your own words',
      onEdit: (next) => {
        const single = confirmedFeelings.length === 1 ? confirmedFeelings[0] : undefined;
        if (single) {
          dispatch({ type: 'set_claim_wording', kind: 'feelings', id: single.id, wording: next });
          return;
        }
        dispatch({ type: 'add_user_claim', kind: 'feelings', text: next });
      },
    },
    {
      id: 'urge',
      label: 'Action urge',
      icon: Zap,
      value: current[3],
      confirmed: current[3].length > 0,
      source: current[3].length > 0 ? 'Selected by you in State Inspector.' : 'Not captured yet.',
      downstream: 'Shapes the message before you have decided to write one.',
      inspectTool: 'state_inspector',
      editLabel: 'What do you feel like doing?',
      onEdit: (next) => dispatch({ type: 'set_action_urge', urge: next.length > 0 ? next : undefined }),
    },
    {
      id: 'message',
      label: 'Message or behaviour',
      icon: MessageSquare,
      value: current[4],
      confirmed: message.length > 0,
      source: situation.compiledDraft?.trim()
        ? 'Compiled draft, not sent.'
        : message.length > 0
          ? 'Your raw wording, not sent.'
          : 'Nothing drafted yet.',
      downstream: 'The only frame the other person ever sees.',
      inspectTool: 'message_compiler',
      editLabel: 'What you are about to send',
      onEdit: (next) => dispatch({ type: 'set_text', patch: { rawOutgoingMessage: next } }),
    },
    {
      id: 'impact',
      label: 'Relationship impact',
      icon: Users,
      value: current[5],
      confirmed: false,
      source: 'Inferred from the frames above. Nobody has reported what actually happened.',
      downstream: 'Becomes the situation frame of the next trace.',
      inspectTool: 'conflict_trace',
      editUnavailable:
        'This frame is a projection, not something you told us, so there is nothing honest to save an edit into here. Conflict Trace is where a real outcome gets recorded.',
    },
  ];

  const confirmedCount = frames.filter((frame) => frame.confirmed).length;
  const traceReady = confirmedCount >= 4;

  useEffect(() => {
    if (traceReady) dispatch({ type: 'mark_tool', tool: 'stack_trace', status: 'complete' });
  }, [traceReady, dispatch]);

  const jokeApplies = humorOn && message.length > 0 && Boolean(situation.actionUrge && HOT_URGES.has(situation.actionUrge));

  return (
    <section aria-labelledby="stack-trace-heading" className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
          Inspect
        </p>
        <h2
          id="stack-trace-heading"
          className="font-display text-display-sm font-semibold tracking-tight text-ink"
        >
          Stack Trace
        </h2>
        <p className="max-w-2xl text-base leading-relaxed text-ink-muted">
          How the situation became a reaction, and the reaction became an outcome. Six frames, in
          order, each one saying whether it is something you confirmed or something we inferred.
        </p>
      </header>

      <Card tone="sunk" elevation="flat">
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Layers aria-hidden="true" className="h-[18px] w-[18px] text-primary" />
            <Badge tone="teal" size="sm">
              {`${confirmedCount} of 6 confirmed`}
            </Badge>
            <Badge tone="slate" size="sm" className="border-dashed">
              {`${6 - confirmedCount} inferred or empty`}
            </Badge>
          </div>
          {hasEdits ? (
            <Button
              variant="outline"
              leadingIcon={History}
              onClick={() => setShowOriginal((value) => !value)}
            >
              {showOriginal ? 'Hide the original trace' : 'Show the original trace'}
            </Button>
          ) : null}
        </CardBody>
      </Card>

      {/* Text description of the trace, for readers who will not see the sequential reveal. */}
      <p className="sr-only">
        {`Trace of six frames, read from cause to impact. ${frames
          .map(
            (frame, index) =>
              `Frame ${index + 1}, ${frame.label}, ${frame.confirmed ? 'confirmed' : 'inferred'}: ${
                frame.value?.trim() || 'not captured yet'
              }.`,
          )
          .join(' ')}`}
      </p>

      <ol className="flex flex-col gap-3">
        {frames.map((frame, index) => (
          <TraceFrame
            key={frame.id}
            frame={{
              ...frame,
              originalValue:
                showOriginal && current[index] !== baseline[index]
                  ? baseline[index] || 'nothing captured'
                  : undefined,
              recalculated: hasEdits && index > firstChanged,
            }}
            index={index}
            total={frames.length}
            onOpenTool={onOpenTool}
            delayMs={index * STAGE_MS}
          />
        ))}
      </ol>

      {jokeApplies ? (
        <p className="font-mono text-base leading-relaxed text-ink-muted">
          Original issue remains unresolved. New issue successfully created.
        </p>
      ) : null}

      <Card elevation="card">
        <CardBody className="flex flex-col gap-3">
          <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
            Change one frame, and the ones after it change too
          </h3>
          <p className="text-base leading-relaxed text-ink-muted">
            Frames two and three are the cheapest to edit and the furthest upstream, which is why
            they are worth checking before frame five gets sent. Editing here keeps the original
            trace so you can compare, rather than overwriting what happened.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              leadingIcon={featureById('thought_debugger').icon}
              trailingIcon={ArrowRight}
              onClick={() => onOpenTool('thought_debugger')}
            >
              Open Thought Debugger
            </Button>
            <Button
              variant="outline"
              leadingIcon={featureById('breakpoint').icon}
              onClick={() => onOpenTool('breakpoint')}
            >
              Pause before frame five
            </Button>
          </div>
        </CardBody>
      </Card>
    </section>
  );
}
