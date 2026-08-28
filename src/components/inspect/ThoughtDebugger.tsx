/**
 * Thought Debugger — brief §8.3, content model from the practice spec §8.3 "Thought Detective"
 * and §8.4 "Logic Bug Scanner".
 *
 * Split screen: the automatic thought on the left, five classification lanes on the right. The
 * user does the sorting; the app does the bookkeeping and then writes the patched interpretation
 * out of what was sorted, so the conclusion is traceable to the user's own classifications rather
 * than asserted over the top of them.
 *
 * Pattern detection uses tentative language throughout (practice spec §8.4: "Never label the user
 * irrational or defective"). A detected pattern is phrased as something the thought *may* contain,
 * because a keyword match is exactly that much evidence.
 */

import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Bug,
  CircleAlert,
  CircleHelp,
  FileDiff,
  MessageCircleQuestion,
  Plus,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, Textarea } from '@/components/ui';
import type { EvidenceCategory } from '@/types/practice';
import type { CurrentSituation } from '@/situation/types';
import type { ClaimKind, SituationAction } from '@/situation/reducer';
import { EvidenceLane, LANES, StatementCard, laneFor } from './EvidenceLane';
import type { LaneItem } from './EvidenceLane';

type ToolProps = {
  situation: CurrentSituation;
  dispatch: React.Dispatch<SituationAction>;
};

/* ── Splitting the thought into classifiable statements ──────────────────── */

const CLAUSE_SPLIT = /(?<=[.!?])\s+|\s+(?:because|and then|and|but|so that|which means|which is why)\s+/i;
const MAX_STATEMENTS = 8;

function splitStatements(thought: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of thought.split(CLAUSE_SPLIT)) {
    const statement = raw.trim().replace(/^[,;:\-\s]+/, '');
    if (statement.length < 4) continue;
    const key = statement.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(statement);
    if (out.length === MAX_STATEMENTS) break;
  }
  return out;
}

/* ── Logic patterns (practice spec §8.4) ─────────────────────────────────── */

type LogicPattern = { id: string; label: string; note: string };

const PATTERN_RULES: ReadonlyArray<{
  id: string;
  label: string;
  note: string;
  cues: readonly string[];
}> = [
  {
    id: 'mind_reading',
    label: 'Mind reading',
    note: 'It states what another person thinks. That is not in the text you have.',
    cues: ['they think', 'she thinks', 'he thinks', 'thinks i', 'knows i', 'assumes i', 'they know i'],
  },
  {
    id: 'all_or_nothing',
    label: 'All-or-nothing thinking',
    note: 'It uses an absolute where a count would do.',
    cues: ['always', 'never', 'every time', 'everyone', 'no one', 'nobody', 'nothing ever'],
  },
  {
    id: 'catastrophizing',
    label: 'Catastrophizing',
    note: 'It jumps to the worst available ending without the steps in between.',
    cues: ['ruined', 'disaster', 'fired', 'over for me', 'falling apart', 'destroyed'],
  },
  {
    id: 'personalization',
    label: 'Personalization',
    note: 'It reads a general event as being aimed at you specifically.',
    cues: ['my fault', 'because of me', 'at me', 'about me', 'targeting me'],
  },
  {
    id: 'emotional_reasoning',
    label: 'Emotional reasoning',
    note: 'It treats the strength of the feeling as evidence for the conclusion.',
    cues: ['i feel like', 'it feels like', 'i just know', 'gut says'],
  },
  {
    id: 'should_statements',
    label: '"Should" statements',
    note: 'It measures against a rule that may never have been agreed.',
    cues: ['should have', 'should not', 'shouldn', 'ought to', 'supposed to', 'has to'],
  },
  {
    id: 'jumping_to_conclusions',
    label: 'Jumping to conclusions',
    note: 'It presents an inference in the grammar of a fact.',
    cues: ['obviously', 'clearly', 'definitely', 'no question', 'of course'],
  },
  {
    id: 'old_conflict',
    label: 'Importing an older conflict',
    note: 'It reaches back for a pattern rather than staying with this one exchange.',
    cues: ['again', 'last time', 'every single time', 'like always', 'here we go'],
  },
];

const MAX_PATTERNS = 3;

function detectPatterns(thought: string): LogicPattern[] {
  const haystack = thought.toLowerCase();
  return PATTERN_RULES.filter((rule) => rule.cues.some((cue) => haystack.includes(cue)))
    .slice(0, MAX_PATTERNS)
    .map(({ id, label, note }) => ({ id, label, note }));
}

/* ── Certainty language, for the diff ────────────────────────────────────── */

const CERTAINTY_MARKERS = [
  'always',
  'never',
  'every time',
  'everyone',
  'no one',
  'nobody',
  'obviously',
  'clearly',
  'definitely',
  'of course',
  'thinks i am',
  'knows i am',
  'does not care',
  'ruined',
  'nothing',
] as const;

function foundCertainty(thought: string): string[] {
  const haystack = thought.toLowerCase();
  return CERTAINTY_MARKERS.filter((marker) => haystack.includes(marker));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Renders the original thought with its certainty language marked, plus a text cue for readers. */
function highlightCertainty(thought: string, markers: string[]): React.ReactNode {
  if (markers.length === 0) return thought;
  const pattern = new RegExp(
    `(${markers.map(escapeRegExp).sort((a, b) => b.length - a.length).join('|')})`,
    'gi',
  );
  const lowered = new Set(markers.map((marker) => marker.toLowerCase()));
  return thought.split(pattern).map((chunk, index) =>
    lowered.has(chunk.toLowerCase()) ? (
      <mark
        key={`${chunk}-${index}`}
        className="rounded-sm bg-coral-soft px-1 font-semibold text-coral-ink"
      >
        {chunk}
        <span className="sr-only"> (certainty language, removed in the patched version)</span>
      </mark>
    ) : (
      <span key={`chunk-${index}`}>{chunk}</span>
    ),
  );
}

/* ── Patched interpretation ──────────────────────────────────────────────── */

function lowerFirst(value: string): string {
  const trimmed = value.trim().replace(/[.!?]+$/, '');
  if (trimmed.length < 2) return trimmed;
  if (trimmed[1] === trimmed[1].toUpperCase() && /[A-Z]/.test(trimmed[1])) return trimmed;
  return trimmed[0].toLowerCase() + trimmed.slice(1);
}

function joinClauses(values: string[]): string {
  const clauses = values.map(lowerFirst);
  if (clauses.length <= 1) return clauses.join('');
  return `${clauses.slice(0, -1).join(', ')} and ${clauses[clauses.length - 1]}`;
}

type Grouped = Record<EvidenceCategory, LaneItem[]>;

function buildPatch(grouped: Grouped): string {
  const parts: string[] = [];
  if (grouped.fact.length > 0) {
    parts.push(`What is established: ${joinClauses(grouped.fact.map((item) => item.statement))}.`);
  }
  if (grouped.guess.length > 0) {
    parts.push(
      `What I am adding: ${joinClauses(grouped.guess.map((item) => item.statement))}. That is my interpretation, not something that was said.`,
    );
  }
  if (grouped.unknown.length > 0) {
    parts.push(
      `What I do not know: ${joinClauses(grouped.unknown.map((item) => item.statement))}.`,
    );
  }
  if (grouped.alternative.length > 0) {
    parts.push(
      `It would also fit that ${joinClauses(grouped.alternative.map((item) => item.statement))}.`,
    );
  }
  if (grouped.feeling.length > 0) {
    parts.push(
      `The reaction stands on its own: ${joinClauses(grouped.feeling.map((item) => item.statement))}. That is real input, and it is not evidence about them.`,
    );
  }
  return parts.join(' ');
}

function retainedConcern(grouped: Grouped): string | null {
  const source = grouped.feeling[0] ?? grouped.fact[0] ?? grouped.unknown[0];
  return source ? source.statement : null;
}

function clarifyingQuestion(grouped: Grouped, recipient: string): string {
  if (grouped.unknown.length > 0) {
    return `I would rather ask ${recipient.toLowerCase()} than guess: "Can you tell me what you actually need here, and by when?"`;
  }
  return `One question before responding: "What would a good outcome on this look like for you?"`;
}

/* ── Screen ──────────────────────────────────────────────────────────────── */

/** The lanes that have a home in the shared situation store. */
const CLAIM_KIND_FOR: Partial<Record<EvidenceCategory, ClaimKind>> = {
  fact: 'facts',
  guess: 'assumptions',
  feeling: 'feelings',
};

function seedThought(situation: CurrentSituation): string {
  const assumption = situation.assumptions[0];
  if (assumption) return assumption.userWording ?? assumption.text;
  return situation.originalEvent ?? '';
}

export function ThoughtDebugger({ situation, dispatch }: ToolProps): JSX.Element {
  const [thought, setThought] = useState(() => seedThought(situation));
  const [loaded, setLoaded] = useState('');
  const [items, setItems] = useState<LaneItem[]>([]);
  const [ownStatement, setOwnStatement] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<EvidenceCategory | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [analysed, setAnalysed] = useState(false);
  const [seq, setSeq] = useState(0);

  const humorOn = !situation.safety.seriousMode && situation.humorLevel !== 'off';

  const unsorted = items.filter((item) => item.category === null);
  const grouped = useMemo<Grouped>(() => {
    const base: Grouped = { fact: [], guess: [], feeling: [], unknown: [], alternative: [] };
    for (const item of items) {
      if (item.category !== null) base[item.category].push(item);
    }
    return base;
  }, [items]);

  const classifiedCount = items.length - unsorted.length;
  const patterns = useMemo(() => detectPatterns(loaded), [loaded]);
  const certainty = useMemo(() => foundCertainty(loaded), [loaded]);
  const patch = buildPatch(grouped);
  const concern = retainedConcern(grouped);
  const mindReading = patterns.some((pattern) => pattern.id === 'mind_reading');
  const allOrNothing = patterns.some((pattern) => pattern.id === 'all_or_nothing');

  const nextId = (): string => {
    const id = `stmt-${seq}`;
    setSeq((current) => current + 1);
    return id;
  };

  const loadThought = (): void => {
    const trimmed = thought.trim();
    if (trimmed.length === 0) return;
    const statements = splitStatements(trimmed);
    setLoaded(trimmed);
    setAnalysed(false);
    setItems(
      statements.map((statement, index) => ({
        id: `stmt-${index}`,
        statement,
        category: null,
        confidence: 'cannot_determine' as const,
      })),
    );
    setSeq(statements.length);
    setAnnouncement(
      `${statements.length} ${statements.length === 1 ? 'statement' : 'statements'} ready to classify.`,
    );

    const already = situation.assumptions.some(
      (claim) => (claim.userWording ?? claim.text).toLowerCase() === trimmed.toLowerCase(),
    );
    if (!already) {
      dispatch({ type: 'add_user_claim', kind: 'assumptions', text: trimmed });
    }
  };

  const move = (id: string, category: EvidenceCategory | null): void => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              category,
              confidence: category ? laneFor(category).confidence : ('cannot_determine' as const),
            }
          : item,
      ),
    );
    const moved = items.find((item) => item.id === id);
    if (moved) {
      setAnnouncement(
        category
          ? `Moved "${moved.statement}" to ${laneFor(category).label}.`
          : `Moved "${moved.statement}" back to unsorted.`,
      );
    }
    setDraggingId(null);
    setDropTarget(null);
  };

  const addStatement = (): void => {
    const trimmed = ownStatement.trim();
    if (trimmed.length === 0) return;
    setItems((current) => [
      ...current,
      { id: nextId(), statement: trimmed, category: null, confidence: 'cannot_determine' as const },
    ]);
    setOwnStatement('');
    setAnnouncement(`Added "${trimmed}" to unsorted.`);
  };

  const compile = (): void => {
    setAnalysed(true);
    // Push each classification into the shared situation, so every other tool inherits the sort
    // the user just did rather than redoing it from scratch.
    for (const [category, kind] of Object.entries(CLAIM_KIND_FOR) as Array<
      [EvidenceCategory, ClaimKind]
    >) {
      for (const item of grouped[category]) {
        const exists = situation[kind].some(
          (claim) => (claim.userWording ?? claim.text).toLowerCase() === item.statement.toLowerCase(),
        );
        if (!exists) dispatch({ type: 'add_user_claim', kind, text: item.statement });
      }
    }
    dispatch({ type: 'mark_tool', tool: 'thought_debugger', status: 'complete' });
    setAnnouncement('Interpretation compiled. Results are below.');
  };

  return (
    <section aria-labelledby="thought-debugger-heading" className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
          Inspect
        </p>
        <h2
          id="thought-debugger-heading"
          className="font-display text-display-sm font-semibold tracking-tight text-ink"
        >
          Thought Debugger
        </h2>
        <p className="max-w-2xl text-base leading-relaxed text-ink-muted">
          Take the thought apart into what was said, what you added, what you felt, and what nobody
          told you. You do the sorting. The interpretation is rebuilt from your sort.
        </p>
      </header>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* Left: the thought and anything not yet classified. */}
        <div className="flex flex-col gap-4">
          <Card elevation="card">
            <CardHeader eyebrow="Input" title="The automatic thought" icon={Bug} />
            <CardBody className="flex flex-col gap-3">
              <Textarea
                label="What keeps showing up?"
                hideLabel
                hint="The sentence that runs on its own. Write it as harshly as it actually arrives."
                rows={4}
                value={thought}
                onChange={(event) => setThought(event.target.value)}
              />
              <Button
                variant="secondary"
                leadingIcon={ScanSearch}
                disabled={thought.trim().length === 0}
                onClick={loadThought}
              >
                Break it into statements
              </Button>
            </CardBody>
          </Card>

          {loaded ? (
            <Card tone="sunk" elevation="flat">
              <CardBody className="flex flex-col gap-3">
                <h3 className="flex items-center justify-between gap-2 font-display text-lg font-semibold tracking-tight text-ink">
                  Unsorted
                  <Badge tone="slate" size="sm" className="border-dotted">
                    <span className="sr-only">Unsorted statements: </span>
                    {unsorted.length}
                  </Badge>
                </h3>
                <ul className="flex flex-col gap-2">
                  {unsorted.map((item) => (
                    <StatementCard
                      key={item.id}
                      item={item}
                      isDragging={draggingId === item.id}
                      onMove={move}
                      onDragStart={setDraggingId}
                      onDragEnd={() => setDraggingId(null)}
                    />
                  ))}
                </ul>
                {unsorted.length === 0 ? (
                  <p className="text-sm leading-relaxed text-ink-muted">
                    Everything is classified. Add another statement below if one is missing.
                  </p>
                ) : null}

                <div className="flex flex-col gap-2 border-t border-line pt-3">
                  <Textarea
                    label="Add a statement the split missed"
                    rows={2}
                    value={ownStatement}
                    onChange={(event) => setOwnStatement(event.target.value)}
                  />
                  <div>
                    <Button
                      variant="outline"
                      leadingIcon={Plus}
                      disabled={ownStatement.trim().length === 0}
                      onClick={addStatement}
                    >
                      Add statement
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ) : null}
        </div>

        {/* Right: the classification lanes. */}
        <div className="flex flex-col gap-4">
          {loaded ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {LANES.map((lane) => (
                  <EvidenceLane
                    key={lane.category}
                    lane={lane}
                    items={grouped[lane.category]}
                    draggingId={draggingId}
                    isDropTarget={dropTarget === lane.category}
                    onMove={move}
                    onDragStart={setDraggingId}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDropTarget(null);
                    }}
                    onDragOverLane={setDropTarget}
                  />
                ))}
              </div>
              <div>
                <Button
                  variant="primary"
                  leadingIcon={Sparkles}
                  disabled={classifiedCount === 0}
                  onClick={compile}
                >
                  Compile the patched interpretation
                </Button>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {classifiedCount === 0
                    ? 'Classify at least one statement first — drag it, or use its menu.'
                    : `${classifiedCount} of ${items.length} statements classified.`}
                </p>
              </div>
            </>
          ) : (
            <Card tone="sunk" elevation="flat">
              <CardBody>
                <p className="text-base leading-relaxed text-ink-muted">
                  The lanes appear once there is a thought to sort. Fact, Assumption, Feeling,
                  Unknown, and Alternative explanation — five places a sentence can go, and most
                  sentences go in more than one place until you make them pick.
                </p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* Result */}
      {analysed ? (
        <div className="flex flex-col gap-4 motion-safe:animate-reveal-up">
          <Card tone="primary" elevation="lift" glow>
            <CardHeader eyebrow="Result" title="Detected logic patterns" icon={CircleAlert} />
            <CardBody className="flex flex-col gap-3">
              {humorOn && mindReading ? (
                <p className="font-mono text-base leading-relaxed text-ink">
                  Mind reading detected. Telepathy service is currently unavailable.
                </p>
              ) : null}
              {humorOn && !mindReading && allOrNothing ? (
                <p className="font-mono text-base leading-relaxed text-ink">
                  &ldquo;Always&rdquo; found in a sample size of one.
                </p>
              ) : null}

              {patterns.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {patterns.map((pattern) => (
                    <li
                      key={pattern.id}
                      className="rounded-card border border-line bg-surface p-3 shadow-card"
                    >
                      <Badge tone="amber" icon={CircleAlert} size="sm" className="border-dashed">
                        {pattern.label}
                      </Badge>
                      <p className="mt-2 text-base leading-relaxed text-ink">
                        {`This thought may contain ${pattern.label.toLowerCase()}. ${pattern.note}`}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-base leading-relaxed text-ink">
                  No common pattern matched. That is not a clean bill of health — it means the
                  wording did not trip any of the checks.
                </p>
              )}
            </CardBody>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card tone="teal" elevation="card">
              <CardBody>
                <h3 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-teal-ink">
                  <ShieldCheck aria-hidden="true" className="h-[18px] w-[18px]" />
                  Evidence for
                </h3>
                <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-base leading-relaxed text-ink">
                  {grouped.fact.map((item) => (
                    <li key={item.id}>{item.statement}</li>
                  ))}
                  {grouped.fact.length === 0 ? (
                    <li className="list-none pl-0 text-ink-muted">
                      Nothing was sorted as fact. Worth noticing.
                    </li>
                  ) : null}
                </ul>
              </CardBody>
            </Card>

            <Card tone="accent" elevation="card">
              <CardBody>
                <h3 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-secondary">
                  <ArrowRight aria-hidden="true" className="h-[18px] w-[18px]" />
                  Evidence against
                </h3>
                <p className="mt-1 text-sm text-ink-muted">
                  Readings that fit the same facts, so the thought is not the only option.
                </p>
                <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-base leading-relaxed text-ink">
                  {grouped.alternative.map((item) => (
                    <li key={item.id}>{item.statement}</li>
                  ))}
                  {grouped.alternative.length === 0 ? (
                    <li className="list-none pl-0 text-ink-muted">
                      No alternative explanation sorted yet.
                    </li>
                  ) : null}
                </ul>
              </CardBody>
            </Card>

            <Card elevation="card">
              <CardBody>
                <h3 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-slate-ink">
                  <CircleHelp aria-hidden="true" className="h-[18px] w-[18px]" />
                  Missing information
                </h3>
                <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-base leading-relaxed text-ink">
                  {grouped.unknown.map((item) => (
                    <li key={item.id}>{item.statement}</li>
                  ))}
                  {grouped.unknown.length === 0 ? (
                    <li className="list-none pl-0 text-ink-muted">
                      Nothing sorted as unknown yet.
                    </li>
                  ) : null}
                </ul>
              </CardBody>
            </Card>
          </div>

          {/* Diff */}
          <Card elevation="lift">
            <CardHeader eyebrow="Diff" title="Original vs patched interpretation" icon={FileDiff} />
            <CardBody className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-card border border-coral/30 bg-coral-soft p-4">
                  <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-coral-ink">
                    Original
                  </p>
                  <p className="mt-2 text-base leading-relaxed text-ink">
                    {highlightCertainty(loaded, certainty)}
                  </p>
                </div>
                <div className="rounded-card border border-teal/30 bg-teal-soft p-4">
                  <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-teal-ink">
                    Patched
                  </p>
                  <p className="mt-2 text-base leading-relaxed text-ink">
                    {patch || 'Classify a statement to build this.'}
                  </p>
                </div>
              </div>

              <dl className="grid gap-3 sm:grid-cols-3">
                <div>
                  <dt className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    Removed certainty
                  </dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {certainty.length > 0 ? (
                      certainty.map((marker) => (
                        <Badge key={marker} tone="coral" size="sm" icon={CircleAlert}>
                          {marker}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-base text-ink-muted">
                        None found. The thought was already hedged.
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    Evidence limits added
                  </dt>
                  <dd className="mt-1.5 text-base leading-relaxed text-ink">
                    {grouped.guess.length + grouped.unknown.length > 0
                      ? `${grouped.guess.length} interpretation${grouped.guess.length === 1 ? '' : 's'} named as yours, ${grouped.unknown.length} unknown${grouped.unknown.length === 1 ? '' : 's'} left open.`
                      : 'None added yet.'}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    Retained valid concern
                  </dt>
                  <dd className="mt-1.5 text-base leading-relaxed text-ink">
                    {concern ?? 'Nothing retained yet.'}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card tone="sunk" elevation="flat">
            <CardBody className="flex flex-col gap-2">
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-ink">
                <MessageCircleQuestion aria-hidden="true" className="h-[18px] w-[18px] text-primary" />
                Clarifying question
              </h3>
              <p className="text-base leading-relaxed text-ink">
                {clarifyingQuestion(grouped, situation.roles.recipient)}
              </p>
              <div className="pt-1">
                <Button
                  variant="outline"
                  trailingIcon={ArrowRight}
                  onClick={() =>
                    dispatch({ type: 'open_tool', tool: 'message_compiler', workspace: 'communicate' })
                  }
                >
                  Take this into Message Compiler
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
