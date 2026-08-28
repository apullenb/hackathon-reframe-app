import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Layers, PenLine } from 'lucide-react';
import { Button, Card, CardBody, Textarea } from '@/components/ui';
import { cn } from '@/lib/cn';
import { FactOrGuessDeck } from './FactOrGuessDeck';
import { InsightCard } from './InsightCard';
import type { FeelingChip } from './InsightCard';
import {
  ROOT_NODE_ID,
  buildOutcome,
  fillIn,
  getNode,
  isOutcome,
  questionsRemaining,
  seriousRouteFor,
} from './questionGraph';
import type { AnswerOption, InspectOutcome, NodeId } from './questionGraph';

export type { InspectOutcome } from './questionGraph';

export type InspectFlowProps = {
  /** Pre-fills nothing; used only to phrase questions naturally, e.g. "your partner". */
  otherPerson: string;
  /** Called when the user chooses to take their words into the translator. */
  onTakeToTranslator: (draft: string) => void;
};

/** One answered question. Enough to rebuild the collected feelings and to step back. */
type Step = {
  nodeId: NodeId;
  /** Feeling words this answer put on the table. */
  feelings: readonly string[];
  /** Free text the user typed here, when it was context rather than a feeling word. */
  quote?: string;
};

/** Long typed feelings become unreadable as chips, so the chip form is clipped. */
const MAX_FEELING_CHIP = 48;

/**
 * Answer buttons have to hold a whole sentence, which the shared Button's single-line label is
 * not shaped for. Rather than rebuild the button, its label span is opened up here. The height
 * comes from the vertical padding (2 x 1rem plus a 1.5rem line) so it clears 56px on one line
 * and grows from there — no fight with the size preset's own min-height.
 */
const ANSWER_BUTTON_CLASSES = cn(
  'min-h-[3.5rem] py-4 text-left',
  '[&>span]:block [&>span]:w-full [&>span]:overflow-visible [&>span]:whitespace-normal [&>span]:text-left',
);

function dedupe(words: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const word of words) {
    const key = word.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(word);
  }
  return out;
}

export function InspectFlow({ otherPerson, onTakeToTranslator }: InspectFlowProps): JSX.Element {
  const [trail, setTrail] = useState<readonly Step[]>([]);
  const [currentId, setCurrentId] = useState<NodeId>(ROOT_NODE_ID);
  const [isTyping, setIsTyping] = useState(false);
  const [draft, setDraft] = useState('');
  /** Words the user looked at on the insight card and said no to. */
  const [rejected, setRejected] = useState<readonly string[]>([]);
  /** Words the user added on the insight card, in their own wording. */
  const [added, setAdded] = useState<readonly string[]>([]);
  /** The fact-or-guess practice deck, which sits beside this flow rather than inside it. */
  const [practising, setPractising] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasMovedRef = useRef(false);

  const node = getNode(currentId);
  const questionNumber = trail.length + 1;

  /**
   * Focus moves to the new question so keyboard users are not stranded where the button they
   * pressed used to be, and screen readers read the question on arrival. The live region below
   * carries only the progress line, so nothing gets announced twice.
   */
  useEffect(() => {
    if (!hasMovedRef.current) {
      hasMovedRef.current = true;
      return;
    }
    headingRef.current?.focus();
  }, [currentId]);

  useEffect(() => {
    setIsTyping(false);
    setDraft('');
  }, [currentId]);

  const advance = useCallback(
    (nextId: NodeId, step: Step) => {
      setTrail((previous) => [...previous, step]);
      setCurrentId(nextId);
    },
    [],
  );

  const chooseAnswer = useCallback(
    (answer: AnswerOption) => {
      advance(answer.next, { nodeId: currentId, feelings: answer.feelings ?? [] });
    },
    [advance, currentId],
  );

  const submitDraft = useCallback(() => {
    if (isOutcome(node)) return;
    const text = draft.trim();
    if (!text) return;

    /**
     * Typed disclosures about safety or self-harm leave the coaching graph here, the same way
     * the equivalent buttons do. Everything else follows the free-text route for this question.
     */
    const seriousRoute = seriousRouteFor(text);
    if (seriousRoute) {
      advance(seriousRoute, { nodeId: currentId, feelings: [] });
      return;
    }

    const captured = node.freeText.capturesFeeling
      ? [
          text.length > MAX_FEELING_CHIP
            ? `${text.slice(0, MAX_FEELING_CHIP).trimEnd()}…`
            : text,
        ]
      : [];

    advance(node.freeText.next, {
      nodeId: currentId,
      feelings: captured,
      quote: node.freeText.capturesFeeling ? undefined : text,
    });
  }, [advance, currentId, draft, node]);

  const goBack = useCallback(() => {
    const last = trail[trail.length - 1];
    if (!last) return;
    setTrail(trail.slice(0, -1));
    setCurrentId(last.nodeId);
  }, [trail]);

  const startOver = useCallback(() => {
    setTrail([]);
    setCurrentId(ROOT_NODE_ID);
    setRejected([]);
    setAdded([]);
  }, []);

  const feelingChips = useMemo<readonly FeelingChip[]>(() => {
    const suggested = dedupe(trail.flatMap((step) => step.feelings));
    const own = dedupe(added).filter(
      (word) => !suggested.some((s) => s.toLocaleLowerCase() === word.toLocaleLowerCase()),
    );
    return [
      ...suggested.map((word) => ({ word, kept: !rejected.includes(word), ownWords: false })),
      ...own.map((word) => ({ word, kept: !rejected.includes(word), ownWords: true })),
    ];
  }, [added, rejected, trail]);

  /** Accepting or rejecting a word is the same gesture either way, so one list drives both. */
  const toggleFeeling = useCallback((word: string) => {
    setRejected((previous) =>
      previous.includes(word) ? previous.filter((w) => w !== word) : [...previous, word],
    );
  }, []);

  const addFeeling = useCallback((word: string) => {
    setAdded((previous) => (previous.includes(word) ? previous : [...previous, word]));
    setRejected((previous) => previous.filter((w) => w !== word));
  }, []);

  // ── Practice deck ──────────────────────────────────────────────────────────
  // A detour, not a step: the trail and the current question are untouched while it is open, so
  // coming back lands exactly where the user left off.
  if (practising) {
    return <FactOrGuessDeck onExit={() => setPractising(false)} />;
  }

  // ── Outcome ────────────────────────────────────────────────────────────────
  if (isOutcome(node)) {
    const kept = feelingChips.filter((chip) => chip.kept).map((chip) => chip.word);
    const outcome: InspectOutcome = buildOutcome(node, kept, otherPerson);
    const quotes = trail.map((step) => step.quote).filter((q): q is string => Boolean(q));

    return (
      <section aria-label="What you found" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" leadingIcon={ArrowLeft} onClick={goBack}>
            Back a question
          </Button>
          <p className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
            {`${trail.length} questions in`}
          </p>
        </div>

        <p aria-live="polite" className="sr-only">
          {`Finished after ${trail.length} questions. Here is what it sounds like.`}
        </p>

        <InsightCard
          node={node}
          outcome={outcome}
          feelings={feelingChips}
          ownWords={node.variant === 'support' ? [] : quotes}
          onToggleFeeling={toggleFeeling}
          onAddFeeling={addFeeling}
          onTakeToTranslator={onTakeToTranslator}
          onStartOver={startOver}
        />
      </section>
    );
  }

  // ── Question ───────────────────────────────────────────────────────────────
  const estimatedTotal = trail.length + questionsRemaining(currentId);
  const progress = Math.round((questionNumber / Math.max(estimatedTotal, questionNumber)) * 100);
  const progressLabel =
    estimatedTotal > questionNumber
      ? `Question ${questionNumber} of about ${estimatedTotal}`
      : `Question ${questionNumber} — last one`;

  return (
    <section aria-label="Working out what is going on" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          leadingIcon={ArrowLeft}
          disabled={trail.length === 0}
          onClick={goBack}
        >
          Back
        </Button>
        <p className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
          {progressLabel}
        </p>
      </div>

      <div
        className="h-1.5 w-full overflow-hidden rounded-chip bg-slate-soft"
        role="presentation"
      >
        <div
          className="h-full rounded-chip bg-primary transition-[width] duration-300 ease-smooth"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Progress only. The question itself is announced by the heading taking focus. */}
      <p aria-live="polite" className="sr-only">
        {progressLabel}
      </p>

      <Card key={node.id} tone="default" elevation="lift" className="motion-safe:animate-reveal-up">
        <CardBody className="space-y-5 py-6">
          <div className="space-y-2">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="font-display text-2xl font-semibold leading-tight tracking-tight text-ink outline-none"
            >
              {fillIn(node.question, otherPerson)}
            </h2>
            {node.helper ? (
              <p className="text-base leading-relaxed text-ink-muted">
                {fillIn(node.helper, otherPerson)}
              </p>
            ) : null}
          </div>

          <ul className="space-y-2.5">
            {node.answers.map((answer) => (
              <li key={answer.id}>
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  className={ANSWER_BUTTON_CLASSES}
                  onClick={() => chooseAnswer(answer)}
                >
                  {fillIn(answer.label, otherPerson)}
                </Button>
              </li>
            ))}

            <li>
              {isTyping ? (
                <div className="space-y-3 rounded-card bg-paper-sunk px-4 py-4">
                  <Textarea
                    label={node.freeText.prompt}
                    placeholder={node.freeText.placeholder}
                    rows={3}
                    value={draft}
                    maxLength={600}
                    autoFocus
                    onChange={(event) => setDraft(event.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      size="md"
                      disabled={draft.trim().length === 0}
                      onClick={submitDraft}
                    >
                      Continue
                    </Button>
                    <Button variant="ghost" size="md" onClick={() => setIsTyping(false)}>
                      Never mind
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
                  leadingIcon={PenLine}
                  className={ANSWER_BUTTON_CLASSES}
                  onClick={() => setIsTyping(true)}
                >
                  {node.freeText.label}
                </Button>
              )}
            </li>
          </ul>
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="md" leadingIcon={Layers} onClick={() => setPractising(true)}>
          Practise: fact or guess?
        </Button>
        <p className="text-sm leading-relaxed text-ink-muted">
          Nothing here leaves your device. This is reflection, not therapy or advice.
        </p>
      </div>
    </section>
  );
}
