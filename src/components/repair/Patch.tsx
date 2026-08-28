/**
 * Patch — brief §8.10.
 *
 * Repair after a message has already been sent. The screen opens with the only two questions that
 * matter — what you sent, and what you wish you had communicated — and everything downstream is
 * derived from those two strings.
 *
 * The incident state is computed from the sent text, not chosen by the user and not guessed by a
 * model: escalating language, absolute framing, paragraph count and the absence of an ask each map
 * to a state. "Serious content; humor disabled" outranks every other state and is also entered
 * whenever the Current Situation is already in serious mode — severity is allowed to move up on
 * its own and never down.
 *
 * The proposed follow-ups are composed from the user's own words. Nothing invents a reason, a
 * promise, or an explanation the user did not supply, because a repair message that contains a new
 * fabrication is a second incident.
 */

import { useMemo, useState } from 'react';
import {
  Bandage,
  CircleCheck,
  ListChecks,
  MessageSquare,
  Save,
  Scissors,
  ShieldAlert,
  Sparkles,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, Textarea } from '@/components/ui';
import { CopyButton } from '@/components/shared';
import { cn } from '@/lib/cn';
import type { BadgeTone } from '@/components/ui';
import type { CurrentSituation, ToolId } from '@/situation/types';
import type { SituationAction } from '@/situation/reducer';

export type ToolProps = {
  situation: CurrentSituation;
  dispatch: React.Dispatch<SituationAction>;
};

/* ── Incident states (brief §8.10, exact copy) ───────────────────────────── */

type IncidentState = 'recoverable' | 'clarification' | 'repair' | 'paragraphs' | 'serious';

const INCIDENT_META: Record<
  IncidentState,
  { label: string; tone: BadgeTone; icon: LucideIcon; summary: string; humor?: string }
> = {
  recoverable: {
    label: 'Recoverable',
    tone: 'teal',
    icon: CircleCheck,
    summary:
      'Nothing in the wording is doing damage. This is a follow-up, not a repair — keep it short and it stays small.',
    humor: 'Production incident detected. Current severity: recoverable.',
  },
  clarification: {
    label: 'Clarification recommended',
    tone: 'amber',
    icon: MessageSquare,
    summary:
      'The message left room for a reading you did not intend. One clarifying line now costs less than the interpretation does later.',
    humor: 'Original issue remains unresolved. New issue successfully created.',
  },
  repair: {
    label: 'Repair recommended',
    tone: 'coral',
    icon: Bandage,
    summary:
      'The wording put the other person on trial. That part needs naming before anything else in the message can be heard.',
    humor: 'Rollback assessment complete. The blast radius includes you.',
  },
  paragraphs: {
    label: 'Stop sending paragraphs',
    tone: 'amber',
    icon: Scissors,
    summary:
      'Length is now the problem. Each additional paragraph gives the reader another sentence to react to instead of the one that mattered.',
    humor: 'Additional paragraphs may increase blast radius.',
  },
  serious: {
    label: 'Serious content; humor disabled',
    tone: 'slate',
    icon: ShieldAlert,
    summary:
      'This situation is marked serious. No jokes, no severity theatre. A short, plain, sincere message is the correct move, and a real conversation is usually better than any text.',
  },
};

/* ── Detectors ───────────────────────────────────────────────────────────── */

const SERIOUS = /\b(hurt myself|suicide|abuse|threat|hit me|scared of (him|her|them)|hospital|died|grief|funeral)\b/i;
const BLAME = /\b(you always|you never|you didn't|you did not|your fault|if you had|you failed)\b/i;
const INSULT = /\b(stupid|idiot|incompetent|lazy|useless|ridiculous|pathetic)\b/i;
const HEAT = /\b(obviously|clearly|as i already said|as i said|frankly|whatever|honestly)\b/i;
const MIND_READING = /\b(you (clearly|obviously) (think|want|don't care)|you don't care|you think i'm|you just want)\b/i;
const ACKNOWLEDGMENT = /\b(i know you|i realise|i realize|that's fair|you're right|you are right|makes sense|thanks for)\b/i;
const ASK = /(\?|\bcan we\b|\bcould we\b|\blet me know\b|\bwould you\b)/i;

function allMatches(text: string, patterns: readonly RegExp[]): string[] {
  const found: string[] = [];
  patterns.forEach((pattern) => {
    const match = text.match(pattern);
    if (match && !found.some((existing) => existing.toLowerCase() === match[0].toLowerCase())) {
      found.push(match[0]);
    }
  });
  return found;
}

function wordCount(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
}

function assessIncident(sent: string, seriousMode: boolean): IncidentState {
  if (seriousMode || SERIOUS.test(sent)) return 'serious';
  if (BLAME.test(sent) || INSULT.test(sent) || MIND_READING.test(sent)) return 'repair';
  const paragraphs = sent.split(/\n{2,}/).filter((part) => part.trim().length > 0).length;
  if (wordCount(sent) > 220 || paragraphs >= 4) return 'paragraphs';
  if (!ASK.test(sent) || HEAT.test(sent)) return 'clarification';
  return 'recoverable';
}

/* ── The patch diff ──────────────────────────────────────────────────────── */

type PatchAnalysis = {
  state: IncidentState;
  problematic: string[];
  acknowledgment: { present: boolean; text: string };
  assumption: { text: string; source: string };
  followUps: { full: string; short: string; apology: string };
};

function buildAnalysis(sent: string, wish: string, situation: CurrentSituation): PatchAnalysis {
  const state = assessIncident(sent, situation.safety.seriousMode);
  const problematic = allMatches(sent, [BLAME, INSULT, HEAT, MIND_READING]);
  const acknowledgmentMatch = sent.match(ACKNOWLEDGMENT);
  const recipient = situation.roles.recipient.toLowerCase();

  const unconfirmedAssumption = situation.assumptions.find((claim) => claim.state !== 'confirmed');
  const mindReading = sent.match(MIND_READING);
  const assumption = unconfirmedAssumption
    ? { text: unconfirmedAssumption.text, source: 'unconfirmed assumption from the Current Situation' }
    : mindReading
      ? { text: mindReading[0], source: 'stated as fact in the message you sent' }
      : { text: 'None found in the text.', source: 'nothing in the message asserts another person’s motive' };

  const wishLine = wish.trim().length > 0 ? wish.trim().replace(/\s*\.?\s*$/, '.') : '';

  const parts: string[] = ['I want to come back to what I sent earlier.'];
  if (!acknowledgmentMatch) {
    parts.push(`I went straight to my side of it and skipped what you were dealing with.`);
  }
  if (problematic.length > 0) {
    parts.push(`Saying "${problematic[0]}" was not fair, and it is not what I actually think.`);
  }
  if (wishLine) parts.push(`What I meant was: ${wishLine}`);
  parts.push('Can we pick this back up when you have a minute?');

  const short = wishLine
    ? `I did not say that well. What I meant was: ${wishLine}`
    : 'I did not say that well. Can I try again?';

  const apology =
    state === 'serious'
      ? 'I am sorry. I would rather talk about this than text about it — tell me when works.'
      : `I am sorry about that message. It was not fair to you, and I would like to talk about it properly.`;

  return {
    state,
    problematic,
    acknowledgment: acknowledgmentMatch
      ? { present: true, text: acknowledgmentMatch[0] }
      : {
          present: false,
          text: `No line acknowledging what your ${recipient} was dealing with. That is usually the part that was missing, not the explanation.`,
        },
    assumption,
    followUps: { full: parts.join(' '), short, apology },
  };
}

/* ── Diff rows ───────────────────────────────────────────────────────────── */

function DiffRow({
  marker,
  label,
  tone,
  children,
}: {
  marker: string;
  label: string;
  tone: 'coral' | 'amber' | 'teal' | 'slate';
  children: React.ReactNode;
}): JSX.Element {
  const toneClass = {
    coral: 'border-coral/35 bg-coral-soft',
    amber: 'border-amber/35 bg-amber-soft',
    teal: 'border-teal/35 bg-teal-soft',
    slate: 'border-line bg-paper-sunk',
  }[tone];

  return (
    <div className={cn('flex gap-3 rounded-card border px-4 py-3', toneClass)}>
      <span
        aria-hidden="true"
        className="mt-0.5 font-mono text-base font-bold leading-none text-ink-muted"
      >
        {marker}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
          {label}
        </p>
        <div className="mt-1 text-base leading-relaxed text-ink">{children}</div>
      </div>
    </div>
  );
}

/* ── Component ───────────────────────────────────────────────────────────── */

type FollowUpKey = 'full' | 'short' | 'apology';

const FOLLOW_UP_LABEL: Record<FollowUpKey, string> = {
  full: 'Full patch',
  short: 'Shorter clarification',
  apology: 'Apology, no overexplaining',
};

export function Patch({
  situation,
  dispatch,
  onOpenTool,
}: ToolProps & { onOpenTool: (t: ToolId) => void }): JSX.Element {
  const [sent, setSent] = useState(situation.rawOutgoingMessage ?? '');
  const [wish, setWish] = useState(situation.desiredOutcome ?? '');
  const [assessed, setAssessed] = useState(false);
  const [chosen, setChosen] = useState<FollowUpKey | null>(null);
  const [saved, setSaved] = useState(false);

  const analysis = useMemo(() => buildAnalysis(sent, wish, situation), [sent, wish, situation]);
  const meta = INCIDENT_META[analysis.state];
  const Icon = meta.icon;

  const humorAllowed =
    situation.safety.humorAllowed &&
    !situation.safety.seriousMode &&
    situation.humorLevel !== 'off' &&
    analysis.state !== 'serious';

  const activeFollowUp = chosen ? analysis.followUps[chosen] : null;

  function assess(): void {
    dispatch({ type: 'set_text', patch: { rawOutgoingMessage: sent, desiredOutcome: wish } });
    dispatch({ type: 'mark_tool', tool: 'patch', status: 'active' });
    setAssessed(true);
    setSaved(false);
  }

  function choose(key: FollowUpKey): void {
    setChosen(key);
    setSaved(false);
    dispatch({ type: 'set_draft', draft: analysis.followUps[key] });
    dispatch({ type: 'mark_tool', tool: 'patch', status: 'complete' });
  }

  return (
    <section className="flex flex-col gap-5" aria-labelledby="patch-heading">
      <Card tone="primary">
        <CardBody className="flex flex-col gap-3">
          <p className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
            repair · patch
          </p>
          <h2 id="patch-heading" className="font-display text-display-sm font-semibold tracking-tight text-ink">
            What did you send, and what do you wish you had communicated?
          </h2>
          <p className="max-w-2xl text-base leading-relaxed text-ink">
            Paste the message as it actually went out. The follow-up is built from your words, so it
            will not invent a reason you did not give.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader eyebrow="incident.input" title="The two questions" icon={Wrench} />
        <CardBody className="flex flex-col gap-4">
          <Textarea
            label="What did you send?"
            hint="Exact wording, including the part you regret."
            rows={7}
            value={sent}
            onChange={(event) => setSent(event.target.value)}
          />
          <Textarea
            label="What do you wish you had communicated?"
            hint="Plain language. This becomes the centre of the follow-up."
            rows={4}
            value={wish}
            onChange={(event) => setWish(event.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              leadingIcon={Sparkles}
              disabled={sent.trim().length === 0}
              onClick={assess}
            >
              {assessed ? 'Re-assess incident' : 'Assess incident'}
            </Button>
            {sent.trim().length === 0 ? (
              <p className="text-sm text-ink-muted">Paste the message you sent to begin.</p>
            ) : null}
          </div>
        </CardBody>
      </Card>

      {assessed ? (
        <>
          <Card tone={analysis.state === 'repair' ? 'coral' : analysis.state === 'recoverable' ? 'teal' : 'default'}>
            <CardBody className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={meta.tone} icon={Icon} size="md">
                  {meta.label}
                </Badge>
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-ink-muted">
                  severity assessed from the text you pasted
                </span>
              </div>
              <p className="max-w-2xl text-base leading-relaxed text-ink">{meta.summary}</p>
              {humorAllowed && meta.humor ? (
                <p className="text-sm italic leading-relaxed text-ink-muted">{meta.humor}</p>
              ) : null}
            </CardBody>
          </Card>

          <Card className="motion-safe:animate-reveal-up">
            <CardHeader eyebrow="patch.diff" title="What changed and what was missing" icon={Bandage} />
            <CardBody className="flex flex-col gap-3">
              <DiffRow marker="—" label="Original message" tone="slate">
                <span className="whitespace-pre-wrap">{sent}</span>
              </DiffRow>

              <DiffRow marker="!" label="Problematic or unclear wording" tone="coral">
                {analysis.problematic.length > 0 ? (
                  <ul className="flex flex-col gap-1">
                    {analysis.problematic.map((phrase) => (
                      <li key={phrase}>
                        <span className="rounded-md border border-coral/30 bg-coral-soft px-1.5 py-0.5 text-coral-ink">
                          {phrase}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-ink-muted">
                    Nothing in the wording itself. What went wrong was more likely what was missing.
                  </span>
                )}
              </DiffRow>

              <DiffRow marker="+" label="Missing acknowledgment" tone="amber">
                {analysis.acknowledgment.present ? (
                  <span>
                    Present — “{analysis.acknowledgment.text}”. Keep it in the follow-up; it is doing
                    work.
                  </span>
                ) : (
                  <span>{analysis.acknowledgment.text}</span>
                )}
              </DiffRow>

              <DiffRow marker="?" label="Unsupported assumption" tone="amber">
                <span>{analysis.assumption.text}</span>
                <span className="mt-1 block font-mono text-xs uppercase tracking-[0.12em] text-ink-muted">
                  {analysis.assumption.source}
                </span>
              </DiffRow>

              <DiffRow marker="+" label="Proposed follow-up" tone="teal">
                <span className="whitespace-pre-wrap">{analysis.followUps.full}</span>
              </DiffRow>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              eyebrow="patch.actions"
              title="Pick the size of the repair"
              actions={
                saved ? (
                  <Badge tone="slate" icon={Save}>
                    Saved for later
                  </Badge>
                ) : undefined
              }
            />
            <CardBody className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <Button leadingIcon={Bandage} onClick={() => choose('full')}>
                  Apply full patch
                </Button>
                <Button variant="outline" leadingIcon={Scissors} onClick={() => choose('short')}>
                  Use shorter clarification
                </Button>
                <Button variant="outline" leadingIcon={MessageSquare} onClick={() => choose('apology')}>
                  Apologize without overexplaining
                </Button>
                <Button variant="ghost" leadingIcon={Save} onClick={() => setSaved(true)}>
                  Save for later
                </Button>
                <Button
                  variant="ghost"
                  leadingIcon={ListChecks}
                  onClick={() => {
                    dispatch({
                      type: 'set_draft',
                      draft: activeFollowUp ?? analysis.followUps.full,
                    });
                    onOpenTool('unit_tests');
                  }}
                >
                  Run Unit Tests
                </Button>
              </div>

              {chosen && activeFollowUp ? (
                <div className="flex flex-col gap-3 rounded-card border border-line bg-paper-sunk px-4 py-3 motion-safe:animate-reveal-up">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                      {FOLLOW_UP_LABEL[chosen]} · now the current draft
                    </p>
                    <CopyButton value={activeFollowUp} label="Copy" size="sm" />
                  </div>
                  <p className="whitespace-pre-wrap text-base leading-relaxed text-ink">
                    {activeFollowUp}
                  </p>
                  <p className="text-sm leading-relaxed text-ink-muted">
                    Send it in your own words if these are not yours. Nothing is sent from here.
                  </p>
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-ink-muted">
                  Choosing one makes it the current draft, so Unit Tests and the Message Compiler
                  pick it up. Nothing is sent from this app.
                </p>
              )}

              {saved ? (
                <p className="text-sm leading-relaxed text-ink-muted">
                  Held for this session only — nothing is persisted, and Reset Demo clears it.
                </p>
              ) : null}
            </CardBody>
          </Card>
        </>
      ) : null}
    </section>
  );
}
