/**
 * Unit Tests — brief §8.7.
 *
 * A real test runner over `situation.compiledDraft`. Every assertion below is a deterministic
 * check against the draft text, not a model call: it can point at the exact substring that failed
 * it, which is the whole reason the "select a failed test, see the phrase" interaction is honest.
 * A green suite here means the draft passed eight mechanical checks — it does not mean the message
 * is right, and the summary says so.
 *
 * Three deliberate constraints:
 *   - "Not applicable" is a first-class status. When the Current Situation has no desired outcome
 *     recorded, the desired-outcome suite reports n/a rather than inventing a verdict.
 *   - Every fix is a pure `draft -> draft` function, so Apply fix is reversible by the user's own
 *     edit and never rewrites anything the user cannot see.
 *   - Ignoring a test marks it n/a rather than passing it. The user may overrule a check; the app
 *     will not pretend the check succeeded.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Braces,
  CircleCheck,
  CircleMinus,
  CircleX,
  Pencil,
  Play,
  Plus,
  TriangleAlert,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, Textarea } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { CurrentSituation, TestResult, TestStatus, ToolId } from '@/situation/types';
import type { SituationAction } from '@/situation/reducer';

export type ToolProps = {
  situation: CurrentSituation;
  dispatch: React.Dispatch<SituationAction>;
};

/* ── Status presentation. Icon + word, never colour alone (brief §17). ───── */

const STATUS_META: Record<TestStatus, { word: string; icon: LucideIcon; chip: string; row: string }> = {
  pass: {
    word: 'PASS',
    icon: CircleCheck,
    chip: 'bg-teal-soft text-teal-ink border-teal/30',
    row: 'border-teal/30',
  },
  warning: {
    word: 'WARN',
    icon: TriangleAlert,
    chip: 'bg-amber-soft text-amber-ink border-amber/30',
    row: 'border-amber/40',
  },
  fail: {
    word: 'FAIL',
    icon: CircleX,
    chip: 'bg-coral-soft text-coral-ink border-coral/30',
    row: 'border-coral/40',
  },
  na: {
    word: 'N/A',
    icon: CircleMinus,
    chip: 'bg-slate-soft text-slate-ink border-slate/30',
    row: 'border-line',
  },
};

/* ── Detectors ───────────────────────────────────────────────────────────── */

const CERTAINTY = /\b(definitely|guaranteed|guarantee|i promise|no risk|100%|for sure|zero chance)\b/i;
const HEDGE = /\b(just wanted to|i just|kind of|sort of|i guess|a little bit|sorry but|to be honest)\b/i;
const BLAME = /\b(you always|you never|you didn't|you did not|if you had|your fault|nobody told me)\b/i;
const OWNERSHIP = /\b(i missed|i should have|i was wrong|i underestimated|my mistake|i did not|i didn't)\b/i;
const NEXT_STEP =
  /(\bi'll\b|\bi will\b|\bcan you\b|\bcould you\b|\bwould you\b|\blet me know\b|\bnext step\b|\bby (monday|tuesday|wednesday|thursday|friday|tomorrow|friday|end of day|eod|the end of)\b)/i;
const HEAT = /\b(obviously|clearly|as i already said|as i said|frankly|seriously|ridiculous|whatever)\b/i;
const INSULT = /\b(stupid|idiot|incompetent|lazy|useless|garbage|moron|pathetic)\b/i;
const JARGON = /\b(regression|refactor|p95|SLA|blocker|latency|backfill|throughput|tech debt)\b/i;
const SHOUTING = /\b[A-Z]{4,}\b/;

function firstMatch(text: string, pattern: RegExp): string | undefined {
  const match = text.match(pattern);
  return match ? match[0] : undefined;
}

function wordCount(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
}

/** Longest sentence in the draft, used as evidence for the clarity check. */
function longestSentence(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.trim().length > 0);
  return sentences.reduce((longest, sentence) => (wordCount(sentence) > wordCount(longest) ? sentence : longest), '');
}

/* ── Fixes ───────────────────────────────────────────────────────────────── */

/** A fix is a pure draft transform, so Apply fix is inspectable and undoable by editing. */
type Fix = { label: string; apply: (draft: string) => string };

const CERTAINTY_REPLACEMENTS: Record<string, string> = {
  definitely: 'currently expect to',
  guaranteed: 'expected',
  guarantee: 'expect',
  'i promise': 'I intend',
  'no risk': 'a risk I have not seen yet',
  '100%': 'as far as I know',
  'for sure': 'as far as I know',
  'zero chance': 'no sign of it so far',
};

const BLAME_REPLACEMENTS: Record<string, string> = {
  'you always': 'in this case',
  'you never': 'this time',
  "you didn't": 'I did not see that',
  'you did not': 'I did not see that',
  'if you had': 'what would have helped is if',
  'your fault': 'what went wrong',
  'nobody told me': 'I did not have',
};

function replaceFix(label: string, target: string, replacement: string): Fix {
  return { label, apply: (draft) => draft.replace(target, replacement) };
}

function removeFix(label: string, target: string): Fix {
  return {
    label,
    apply: (draft) => draft.replace(target, '').replace(/\s{2,}/g, ' ').replace(/\s+([.,!?])/g, '$1').trim(),
  };
}

function appendFix(label: string, sentence: string): Fix {
  return { label, apply: (draft) => `${draft.trimEnd()} ${sentence}`.trim() };
}

/* ── Assertions ──────────────────────────────────────────────────────────── */

type Check = TestResult & { suite: string; mono: string; fix?: Fix };

function buildChecks(draft: string, situation: CurrentSituation): Check[] {
  const words = wordCount(draft);
  const checks: Check[] = [];

  /* 1. Truth */
  const certainty = firstMatch(draft, CERTAINTY);
  checks.push(
    certainty
      ? {
          id: 'truth',
          suite: 'Truth',
          mono: 'truth.no_unsupported_commitment',
          label: 'Adds a commitment the facts do not support',
          status: 'fail',
          explanation: `"${certainty}" states more certainty than anything recorded in the Current Situation. If it turns out to be wrong, this is the sentence you will be held to.`,
          evidence: certainty,
          fix: replaceFix(
            `Soften "${certainty}"`,
            certainty,
            CERTAINTY_REPLACEMENTS[certainty.toLowerCase()] ?? 'expect to',
          ),
        }
      : {
          id: 'truth',
          suite: 'Truth',
          mono: 'truth.no_unsupported_commitment',
          label: 'Preserves confirmed facts, adds no new promises',
          status: 'pass',
          explanation: 'No absolute guarantees or invented commitments found in the draft.',
        },
  );

  /* 2. Clarity */
  const hedge = firstMatch(draft, HEDGE);
  const longest = longestSentence(draft);
  if (hedge) {
    checks.push({
      id: 'clarity',
      suite: 'Clarity',
      mono: 'clarity.no_softening_preamble',
      label: 'Opens by apologising for taking up space',
      status: 'warning',
      explanation: `"${hedge}" makes the request easier to skim past. Removing it does not make the message ruder.`,
      evidence: hedge,
      fix: removeFix(`Remove "${hedge}"`, hedge),
    });
  } else if (wordCount(longest) > 32) {
    checks.push({
      id: 'clarity',
      suite: 'Clarity',
      mono: 'clarity.sentence_length',
      label: 'One sentence carries too much at once',
      status: 'warning',
      explanation: `The longest sentence runs ${wordCount(longest)} words. Splitting it in two is usually enough.`,
      evidence: longest,
    });
  } else {
    checks.push({
      id: 'clarity',
      suite: 'Clarity',
      mono: 'clarity.sentence_length',
      label: 'Reads in one pass',
      status: 'pass',
      explanation: 'No hedging preamble, and no sentence over 32 words.',
    });
  }

  /* 3. Accountability */
  const blame = firstMatch(draft, BLAME);
  if (blame) {
    checks.push({
      id: 'accountability',
      suite: 'Accountability',
      mono: 'accountability.no_blame_framing',
      label: 'Assigns the problem to the recipient',
      status: 'fail',
      explanation: `"${blame}" puts the reader on trial in the first read. Whatever follows it is heard as defence.`,
      evidence: blame,
      fix: replaceFix(
        `Rewrite "${blame}"`,
        blame,
        BLAME_REPLACEMENTS[blame.toLowerCase()] ?? 'what happened is',
      ),
    });
  } else if (OWNERSHIP.test(draft)) {
    checks.push({
      id: 'accountability',
      suite: 'Accountability',
      mono: 'accountability.owns_a_part',
      label: 'Names your own part without collapsing',
      status: 'pass',
      explanation: 'The draft takes responsibility for something you actually control.',
    });
  } else {
    checks.push({
      id: 'accountability',
      suite: 'Accountability',
      mono: 'accountability.owns_a_part',
      label: 'No sentence takes responsibility for anything',
      status: 'warning',
      explanation:
        'Nothing here is blaming, but nothing is owned either. If any part of this was yours, saying so early costs one sentence and buys a lot of goodwill.',
    });
  }

  /* 4. Recipient fit */
  const jargon = firstMatch(draft, JARGON);
  checks.push(
    jargon
      ? {
          id: 'recipient_fit',
          suite: 'Recipient fit',
          mono: 'recipient.shared_vocabulary',
          label: `Uses a term your ${situation.roles.recipient.toLowerCase()} may read differently`,
          status: 'warning',
          explanation: `"${jargon}" means something specific to you. Confirm it means the same thing to a ${situation.roles.recipient.toLowerCase()} before relying on it to carry the message.`,
          evidence: jargon,
        }
      : {
          id: 'recipient_fit',
          suite: 'Recipient fit',
          mono: 'recipient.shared_vocabulary',
          label: `Readable by a ${situation.roles.recipient.toLowerCase()}`,
          status: 'pass',
          explanation: `No unexplained internal shorthand. Checked against the recipient role recorded in the Current Situation, not against the person.`,
        },
  );

  /* 5. Desired outcome — genuinely not applicable when nothing was recorded. */
  if (!situation.desiredOutcome || situation.desiredOutcome.trim().length === 0) {
    checks.push({
      id: 'desired_outcome',
      suite: 'Desired outcome',
      mono: 'outcome.requests_the_outcome',
      label: 'No desired outcome recorded to test against',
      status: 'na',
      explanation:
        'The Current Situation has no desired outcome. Rather than guess what you wanted, this assertion reports not applicable.',
    });
  } else if (NEXT_STEP.test(draft)) {
    checks.push({
      id: 'desired_outcome',
      suite: 'Desired outcome',
      mono: 'outcome.requests_the_outcome',
      label: 'Includes a next step',
      status: 'pass',
      explanation: `The draft contains an offer or a request, which is what "${situation.desiredOutcome}" needs to happen.`,
    });
  } else {
    checks.push({
      id: 'desired_outcome',
      suite: 'Desired outcome',
      mono: 'outcome.requests_the_outcome',
      label: 'No follow-up time provided',
      status: 'fail',
      explanation: `You recorded the outcome "${situation.desiredOutcome}", but the draft never asks for it or offers a time. The reader has nothing to act on.`,
      fix: appendFix('Add a next step', 'I can follow up with a firm date by end of day tomorrow — does that work?'),
    });
  }

  /* 6. Tone */
  const heat = firstMatch(draft, HEAT);
  const shouting = firstMatch(draft, SHOUTING);
  const bangs = (draft.match(/!/g) ?? []).length;
  if (heat) {
    checks.push({
      id: 'tone',
      suite: 'Tone',
      mono: 'tone.no_score_settling',
      label: 'Contains a small score being settled',
      status: 'warning',
      explanation: `"${heat}" adds no information and reads as a point being made. The sentence works without it.`,
      evidence: heat,
      fix: removeFix(`Remove "${heat}"`, heat),
    });
  } else if (shouting || bangs >= 3) {
    checks.push({
      id: 'tone',
      suite: 'Tone',
      mono: 'tone.volume',
      label: 'Reads louder than you probably intend',
      status: 'warning',
      explanation: shouting
        ? `"${shouting}" is in capitals. In text, that is volume, not emphasis.`
        : `${bangs} exclamation marks. Intensity reads as either anger or nerves, and the reader picks.`,
      evidence: shouting,
    });
  } else {
    checks.push({
      id: 'tone',
      suite: 'Tone',
      mono: 'tone.volume',
      label: 'Level and unsarcastic',
      status: 'pass',
      explanation: 'No sarcasm markers, capitals, or stacked exclamation marks.',
    });
  }

  /* 7. Safety */
  const insult = firstMatch(draft, INSULT);
  if (insult) {
    checks.push({
      id: 'safety',
      suite: 'Safety',
      mono: 'safety.no_character_attack',
      label: 'Attacks the person rather than the problem',
      status: 'fail',
      explanation: `"${insult}" describes a person, not an event. It is the part that will still be quoted back to you in six months.`,
      evidence: insult,
      fix: removeFix(`Remove "${insult}"`, insult),
    });
  } else {
    checks.push({
      id: 'safety',
      suite: 'Safety',
      mono: 'safety.no_character_attack',
      label: 'No character attacks or threats',
      status: 'pass',
      explanation: situation.safety.seriousMode
        ? 'Serious mode is on. The draft was checked for escalating language and contains none. This check does not assess anyone else’s safety.'
        : 'The draft was checked for insults and escalating language and contains none. This check does not assess anyone else’s safety.',
    });
  }

  /* 8. Length */
  if (words > 180) {
    const paragraphs = draft.split(/\n{2,}/);
    checks.push({
      id: 'length',
      suite: 'Length',
      mono: 'length.blast_radius',
      label: `${words} words for a ${situation.roles.channel.toLowerCase()} message`,
      status: 'warning',
      explanation: `Past roughly 180 words, a reader skims for the ask and answers the part they skimmed. There are ${paragraphs.length} paragraphs here.`,
      fix:
        paragraphs.length > 2
          ? { label: 'Keep the first two paragraphs', apply: () => paragraphs.slice(0, 2).join('\n\n').trim() }
          : undefined,
    });
  } else if (words > 0 && words < 8) {
    checks.push({
      id: 'length',
      suite: 'Length',
      mono: 'length.blast_radius',
      label: `${words} words may read as curt`,
      status: 'warning',
      explanation: 'Short is usually good. Under eight words, tone gets supplied by the reader.',
    });
  } else {
    checks.push({
      id: 'length',
      suite: 'Length',
      mono: 'length.blast_radius',
      label: `${words} words, appropriate for ${situation.roles.channel.toLowerCase()}`,
      status: 'pass',
      explanation: 'Long enough to be clear, short enough to be read in one go.',
    });
  }

  return checks;
}

/* ── Custom assertions in plain language ─────────────────────────────────── */

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'to', 'of', 'in',
  'on', 'for', 'with', 'that', 'this', 'it', 'as', 'at', 'by', 'my', 'me', 'i', 'we', 'you', 'they',
  'should', 'must', 'does', 'do', 'not', 'no', 'any', 'has', 'have', 'message', 'draft', 'says',
  'say', 'mention', 'mentions', 'include', 'includes', 'contain', 'contains', 'make', 'makes', 'sure',
]);

/** Crude but honest: a literal term search, described to the user as exactly that. */
function evaluateCustom(assertion: string, draft: string, index: number): Check {
  const terms = assertion
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((term) => term.length > 2 && !STOPWORDS.has(term));
  const haystack = draft.toLowerCase();
  const stem = (term: string) => term.replace(/(ing|ed|es|s)$/, '');
  const found = terms.filter((term) => haystack.includes(stem(term)));
  const missing = terms.filter((term) => !haystack.includes(stem(term)));

  const status: TestStatus =
    terms.length === 0 ? 'na' : missing.length === 0 ? 'pass' : found.length > 0 ? 'warning' : 'fail';

  const evidenceTerm = found[0];
  const evidenceMatch = evidenceTerm
    ? draft.match(new RegExp(`\\b${stem(evidenceTerm).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*`, 'i'))
    : null;

  return {
    id: `custom-${index}`,
    suite: 'Custom',
    mono: `custom.assertion_${index + 1}`,
    label: assertion,
    status,
    evidence: evidenceMatch ? evidenceMatch[0] : undefined,
    explanation:
      terms.length === 0
        ? 'No searchable terms in that assertion, so this reports not applicable rather than guessing.'
        : missing.length === 0
          ? `Literal term check. Found in the draft: ${found.join(', ')}.`
          : `Literal term check — this looks for your words, not your meaning. Not found: ${missing.join(', ')}.`,
  };
}

/* ── Draft with the selected evidence highlighted ────────────────────────── */

function HighlightedDraft({ draft, evidence }: { draft: string; evidence?: string }): JSX.Element {
  if (!evidence) return <p className="whitespace-pre-wrap text-base leading-relaxed text-ink">{draft}</p>;
  const start = draft.toLowerCase().indexOf(evidence.toLowerCase());
  if (start < 0) return <p className="whitespace-pre-wrap text-base leading-relaxed text-ink">{draft}</p>;

  return (
    <p className="whitespace-pre-wrap text-base leading-relaxed text-ink">
      {draft.slice(0, start)}
      <mark className="rounded-md border border-amber/40 bg-amber-soft px-1 py-0.5 text-amber-ink">
        {draft.slice(start, start + evidence.length)}
      </mark>
      {draft.slice(start + evidence.length)}
    </p>
  );
}

/* ── Component ───────────────────────────────────────────────────────────── */

const STEP_MS = 170;

export function UnitTestRunner({
  situation,
  dispatch,
  onOpenTool,
}: ToolProps & { onOpenTool: (t: ToolId) => void }): JSX.Element {
  const draft = situation.compiledDraft ?? situation.rawOutgoingMessage ?? '';
  const usingRaw = !situation.compiledDraft && draft.length > 0;

  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [revealed, setRevealed] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ignored, setIgnored] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [customAssertions, setCustomAssertions] = useState<readonly string[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [editing, setEditing] = useState(false);
  const [editorValue, setEditorValue] = useState(draft);
  const autoRan = useRef(false);

  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const checks = useMemo<Check[]>(() => {
    if (draft.trim().length === 0) return [];
    const base = buildChecks(draft, situation);
    const custom = customAssertions.map((assertion, index) => evaluateCustom(assertion, draft, index));
    return [...base, ...custom].map((check) =>
      ignored.has(check.id)
        ? { ...check, status: 'na' as const, explanation: `Ignored by you. ${check.explanation}` }
        : check,
    );
  }, [draft, situation, customAssertions, ignored]);

  const run = useCallback(() => {
    setRevealed(0);
    setSelectedId(null);
    setPhase('running');
  }, []);

  /* Auto-run once on arrival: the user came here to see the result, not to press start. */
  useEffect(() => {
    if (autoRan.current || checks.length === 0) return;
    autoRan.current = true;
    run();
  }, [checks.length, run]);

  useEffect(() => {
    if (phase !== 'running') return undefined;
    if (revealed >= checks.length) {
      setPhase('done');
      dispatch({
        type: 'set_tests',
        results: checks.map(({ id, label, status, explanation, evidence }) => ({
          id,
          label,
          status,
          explanation,
          evidence,
        })),
      });
      dispatch({ type: 'mark_tool', tool: 'unit_tests', status: 'complete' });
      return undefined;
    }
    const timer = setTimeout(() => setRevealed((count) => count + 1), reduceMotion ? 0 : STEP_MS);
    return () => clearTimeout(timer);
  }, [phase, revealed, checks, dispatch, reduceMotion]);

  const visible = phase === 'idle' ? checks : checks.slice(0, revealed);
  const selected = checks.find((check) => check.id === selectedId) ?? null;

  const tally = useMemo(() => {
    const counts = { pass: 0, warning: 0, fail: 0, na: 0 };
    checks.forEach((check) => {
      counts[check.status] += 1;
    });
    return counts;
  }, [checks]);

  const summary = [
    `${tally.pass} passed`,
    tally.warning > 0 ? `${tally.warning} warning${tally.warning === 1 ? '' : 's'}` : null,
    tally.fail > 0 ? `${tally.fail} failed` : null,
    tally.na > 0 ? `${tally.na} not applicable` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(' · ');

  const humorAllowed =
    situation.safety.humorAllowed && !situation.safety.seriousMode && situation.humorLevel !== 'off';
  const allGreen = tally.fail === 0 && tally.warning === 0;

  function applyFix(check: Check): void {
    if (!check.fix) return;
    const next = check.fix.apply(draft);
    dispatch({ type: 'set_draft', draft: next });
    setEditorValue(next);
    setSelectedId(null);
    setRevealed(0);
    setPhase('running');
  }

  if (draft.trim().length === 0) {
    return (
      <section className="flex flex-col gap-5" aria-labelledby="unit-tests-heading">
        <Card tone="sunk">
          <CardBody className="flex flex-col items-start gap-3">
            <h2
              id="unit-tests-heading"
              className="font-display text-display-sm font-semibold tracking-tight text-ink"
            >
              Nothing to test yet
            </h2>
            <p className="max-w-xl text-base leading-relaxed text-ink-muted">
              Unit Tests runs assertions against a compiled draft. Write one in the Message Compiler
              and come back — the draft travels with you.
            </p>
            <Button leadingIcon={Braces} onClick={() => onOpenTool('message_compiler')}>
              Open Message Compiler
            </Button>
          </CardBody>
        </Card>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5" aria-labelledby="unit-tests-heading">
      <Card tone="primary">
        <CardBody className="flex flex-col gap-3">
          <p className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
            communicate · unit_tests
          </p>
          <h2
            id="unit-tests-heading"
            className="font-display text-display-sm font-semibold tracking-tight text-ink"
          >
            Assertions against your draft
          </h2>
          <p className="max-w-2xl text-base leading-relaxed text-ink">
            Eight suites, run on the text itself. Each one can point at the phrase that decided it.
            {usingRaw ? ' Testing your raw message, since nothing has been compiled yet.' : ''}
          </p>
        </CardBody>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <Card>
          <CardHeader
            eyebrow="suite.run"
            title="Test run"
            actions={
              <Button
                size="sm"
                variant="outline"
                leadingIcon={Play}
                isLoading={phase === 'running'}
                onClick={run}
              >
                {phase === 'running' ? 'Running' : 'Re-run'}
              </Button>
            }
          />
          <CardBody className="flex flex-col gap-2">
            <ul className="flex flex-col gap-2">
              {visible.map((check, index) => {
                const meta = STATUS_META[check.status];
                const Icon = meta.icon;
                const isSelected = selectedId === check.id;
                return (
                  <li key={check.id}>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedId(isSelected ? null : check.id)}
                      style={reduceMotion ? undefined : { animationDelay: `${index * 20}ms` }}
                      className={cn(
                        'flex min-h-tap w-full items-start gap-3 rounded-card border px-3 py-2.5 text-left',
                        'bg-surface transition-[box-shadow,border-color,background-color] duration-200',
                        meta.row,
                        'hover:shadow-lift',
                        isSelected && 'bg-paper-sunk shadow-lift',
                        'motion-safe:animate-reveal-up',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center gap-1.5 rounded-chip border px-2 py-1',
                          'font-mono text-xs font-bold tracking-[0.08em]',
                          meta.chip,
                        )}
                      >
                        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                        {meta.word}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-semibold leading-snug tracking-tight text-ink">
                          {check.label}
                        </span>
                        <span className="mt-0.5 block font-mono text-xs uppercase tracking-[0.12em] text-ink-muted">
                          {check.mono}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {phase === 'running' ? (
              <p
                className="font-mono text-sm text-ink-muted"
                role="status"
                aria-live="polite"
              >
                running {Math.min(revealed + 1, checks.length)} / {checks.length}…
              </p>
            ) : null}

            {phase === 'done' ? (
              <div className="mt-1 flex flex-col gap-2 rounded-card border border-line bg-paper-sunk px-4 py-3">
                <p
                  className="font-mono text-base font-bold tabular-nums tracking-tight text-ink"
                  role="status"
                  aria-live="polite"
                >
                  {summary}
                </p>
                {humorAllowed && allGreen ? (
                  <p className="text-sm italic leading-relaxed text-ink-muted">
                    Tests passed. Human response remains nondeterministic.
                  </p>
                ) : (
                  <p className="text-sm leading-relaxed text-ink-muted">
                    Select any assertion to see the phrase that decided it.
                  </p>
                )}
              </div>
            ) : null}

            {/* Custom assertion in plain language. */}
            <form
              className="mt-2 flex flex-wrap items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const value = customInput.trim();
                if (value.length === 0) return;
                setCustomAssertions((current) => [...current, value]);
                setCustomInput('');
                setRevealed(0);
                setPhase('running');
              }}
            >
              <label className="flex min-w-[16rem] flex-1 flex-col gap-1.5">
                <span className="text-sm font-semibold tracking-tight text-ink">
                  Add your own assertion
                </span>
                <input
                  type="text"
                  value={customInput}
                  onChange={(event) => setCustomInput(event.target.value)}
                  placeholder="e.g. mentions the Thursday deadline"
                  className={cn(
                    'min-h-tap w-full rounded-card border border-line-strong bg-paper-sunk/50 px-4 py-2.5',
                    'text-base text-ink shadow-inner-top placeholder:text-ink-muted/70',
                    'transition-colors duration-200 focus:border-primary-ring focus:bg-surface',
                  )}
                />
              </label>
              <Button type="submit" variant="outline" leadingIcon={Plus}>
                Assert
              </Button>
            </form>
            <p className="text-sm leading-relaxed text-ink-muted">
              Custom assertions are a literal search for your words in the draft. They check wording,
              not meaning, and the result says which terms were found.
            </p>
          </CardBody>
        </Card>

        <div className="flex flex-col gap-5">
          <Card className={cn(selected?.evidence && 'border-amber/40')}>
            <CardHeader
              eyebrow="draft.under_test"
              title="The draft"
              actions={
                <Button
                  size="sm"
                  variant="ghost"
                  leadingIcon={Pencil}
                  onClick={() => {
                    setEditorValue(draft);
                    setEditing((current) => !current);
                  }}
                >
                  {editing ? 'Cancel' : 'Edit myself'}
                </Button>
              }
            />
            <CardBody className="flex flex-col gap-3">
              {editing ? (
                <>
                  <Textarea
                    label="Edit the draft"
                    hideLabel
                    rows={10}
                    value={editorValue}
                    onChange={(event) => setEditorValue(event.target.value)}
                  />
                  <Button
                    onClick={() => {
                      dispatch({ type: 'set_draft', draft: editorValue });
                      setEditing(false);
                      setRevealed(0);
                      setSelectedId(null);
                      setPhase('running');
                    }}
                  >
                    Save and re-run
                  </Button>
                </>
              ) : (
                <HighlightedDraft draft={draft} evidence={selected?.evidence} />
              )}
            </CardBody>
          </Card>

          {selected ? (
            <Card
              key={selected.id}
              tone="sunk"
              className="motion-safe:animate-reveal-up"
            >
              <CardBody className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    tone={
                      selected.status === 'pass'
                        ? 'teal'
                        : selected.status === 'warning'
                          ? 'amber'
                          : selected.status === 'fail'
                            ? 'coral'
                            : 'slate'
                    }
                    icon={STATUS_META[selected.status].icon}
                  >
                    {STATUS_META[selected.status].word}
                  </Badge>
                  <span className="font-mono text-xs uppercase tracking-[0.12em] text-ink-muted">
                    {selected.suite}
                  </span>
                </div>
                <p className="text-base font-semibold leading-snug tracking-tight text-ink">
                  {selected.label}
                </p>
                <p className="text-sm leading-relaxed text-ink-muted">{selected.explanation}</p>

                {selected.status === 'fail' || selected.status === 'warning' ? (
                  <div className="flex flex-wrap gap-2">
                    {selected.fix ? (
                      <Button size="sm" leadingIcon={Wrench} onClick={() => applyFix(selected)}>
                        {selected.fix.label}
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      leadingIcon={CircleMinus}
                      onClick={() => {
                        setIgnored((current) => new Set([...current, selected.id]));
                        setSelectedId(null);
                      }}
                    >
                      Ignore
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      leadingIcon={Pencil}
                      onClick={() => {
                        setEditorValue(draft);
                        setEditing(true);
                      }}
                    >
                      Edit myself
                    </Button>
                  </div>
                ) : null}

                {selected.status === 'na' && ignored.has(selected.id) ? (
                  <p className="text-sm leading-relaxed text-ink-muted">
                    Ignored assertions are recorded as not applicable, never as passing.
                  </p>
                ) : null}
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </section>
  );
}
