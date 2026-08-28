/**
 * Repair — conflict resolution.
 *
 * The user arrives holding an argument. This view carries them from "here is what happened" to
 * "here is what each of us was saying, and here is what it was actually about". The analysis
 * itself lives elsewhere: `analyze` is supplied by the parent, and `ConflictLensResult` renders
 * the map. What lives here is the path between them.
 *
 * Two equal ways in, on purpose. A screenshot is what most people actually have, and a
 * description in their own words is what most people actually want to give. Neither is the
 * fallback for the other.
 *
 * The one usability rule this file exists to protect: a free-text description is never sent
 * back to be reformatted. If the text does not read as a `Name: message` transcript, it goes
 * straight to analysis with two plain speakers. Nobody is asked to retype their argument into
 * a format before they can be helped.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, ImageUp, Loader2, MessageSquareHeart, PenLine } from 'lucide-react';
import {
  ConflictLensResult,
  ScreenshotUpload,
  SpeakerConfirmation,
  parseConversation,
  speakersFromParse,
} from '@/components/conflict';
import type { ParseResult } from '@/components/conflict';
import { ErrorFallback } from '@/components/shared';
import { Button, Card, CardBody, CardHeader, Textarea } from '@/components/ui';
import {
  CONFLICT_ALEX_SAM_CONVERSATION,
  CONFLICT_ALEX_SAM_SPEAKERS,
} from '@/fixtures/conflictAlexSam';
import { cn } from '@/lib/cn';
import type {
  ConflictLensResponse,
  ConflictSpeaker,
  ContextSwitchError,
} from '@/types/contracts';

/**
 * The built-in example. Optional: the parent may hand over its own copy, and if it includes a
 * ready response the example is shown without a round-trip. Otherwise the fixture is used and
 * `analyze` runs as normal.
 */
export type RepairExample = {
  conversation: string;
  speakers: ConflictSpeaker[];
  response?: ConflictLensResponse;
};

export type RepairViewProps = {
  /** Who the other person is, for natural phrasing. */
  otherPerson: string;
  /** Runs the conflict analysis. Resolves to the validated response, or an error to display. */
  analyze: (
    conversation: string,
    speakers: ConflictSpeaker[],
  ) => Promise<{ ok: true; response: ConflictLensResponse } | { ok: false; message: string }>;
  /** Loads the built-in example conversation. */
  onLoadExample: () => void;
  /** Overrides the built-in example, and can carry a ready response to show instantly. */
  example?: RepairExample;
};

/** Where the user is in the flow. The conversation text lives outside this, so it survives all of it. */
type Phase =
  | { kind: 'input' }
  | { kind: 'confirm'; parse: ParseResult }
  | { kind: 'analyzing' }
  | { kind: 'result'; response: ConflictLensResponse; speakers: ConflictSpeaker[] }
  | { kind: 'error'; message: string };

/** What was actually submitted, so Try again repeats it exactly. */
type Submission = { conversation: string; speakers: ConflictSpeaker[] };

/**
 * Plain-language stages for the wait. They advance on a timer because one non-streaming call
 * reports no progress, and naming the steps honestly beats a bare spinner or a fake percentage.
 */
const STAGES = [
  'Reading what each person said',
  'Noticing where it turned',
  'Working out what it is actually about',
  'Putting together what you could say next',
] as const;

const STAGE_MS = 900;

/**
 * Is this a pasted conversation, or is it someone telling us what happened?
 *
 * The bar for "conversation" is deliberately high: two distinct speaker labels. One label, or
 * three, or none, all mean the parse is not confident enough to be worth interrupting the user
 * over — so those go straight to analysis with plain speakers. A description is never bounced
 * back to be reformatted, and the full text reaches the analysis either way; only the names
 * differ.
 */
function readsAsConversation(parse: ParseResult): boolean {
  return parse.problem === 'none' && parse.speakerLabels.length === 2;
}

/** A relationship that just repeats the name adds nothing under it, so it is dropped. */
function withoutRedundantRoles(speakers: ConflictSpeaker[]): ConflictSpeaker[] {
  return speakers.map((speaker) =>
    speaker.role.toLocaleLowerCase() === speaker.label.toLocaleLowerCase()
      ? { ...speaker, role: '' }
      : speaker,
  );
}

/** Two speakers for a description, so the map still has a "you" side and a "them" side. */
function plainSpeakers(other: string): ConflictSpeaker[] {
  return [
    { id: 'you', label: 'You', role: '', isUser: true },
    { id: 'them', label: other, role: '', isUser: false },
  ];
}

/**
 * The lead is an even-handed one-glance summary, so it must never be the first thing read when
 * the response says this exchange should not be split down the middle. In that case the lead is
 * dropped and `ConflictLensResult`'s own notice — which it renders above everything — leads
 * instead. The notice itself is never touched.
 */
function leadIsAppropriate(response: ConflictLensResponse): boolean {
  if (response.falseEquivalenceWarning !== undefined) return false;
  const safety = response.safety;
  if (safety === undefined) return true;
  if (!safety.allowStandardOutput) return false;
  return safety.category === 'none' || safety.category === 'high_stakes_professional';
}

type LeadLine = { speakerId: string; name: string; says: string };

function leadLines(response: ConflictLensResponse, speakers: ConflictSpeaker[]): LeadLine[] {
  return response.participants.map((participant) => {
    const match = speakers.find((speaker) => speaker.id === participant.speakerId);
    return {
      speakerId: participant.speakerId,
      name: match?.label ?? participant.speakerId,
      says: participant.whatTheyMayBeTryingToSay,
    };
  });
}

/** `analyze` hands back a message; `ErrorFallback` wants the standard shape. */
function asDisplayError(message: string): ContextSwitchError {
  return { kind: 'provider_error', userMessage: message, fixtureAvailable: true };
}

const BUILT_IN_EXAMPLE: RepairExample = {
  conversation: CONFLICT_ALEX_SAM_CONVERSATION,
  speakers: CONFLICT_ALEX_SAM_SPEAKERS,
};

export function RepairView({
  otherPerson,
  analyze,
  onLoadExample,
  example = BUILT_IN_EXAMPLE,
}: RepairViewProps): JSX.Element {
  const trimmedOther = otherPerson.trim();
  const other = trimmedOther.length > 0 ? trimmedOther : 'the other person';

  const [conversation, setConversation] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'input' });
  const [userLabel, setUserLabel] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [submission, setSubmission] = useState<Submission | null>(null);

  /** Ignore a result that arrives after the user moved on, or after unmount. */
  const runIdRef = useRef(0);
  const aliveRef = useRef(true);
  useEffect(
    () => () => {
      aliveRef.current = false;
    },
    [],
  );

  const analyzing = phase.kind === 'analyzing';

  useEffect(() => {
    if (!analyzing) return undefined;
    if (stage >= STAGES.length - 1) return undefined;
    const timer = window.setTimeout(() => setStage((current) => current + 1), STAGE_MS);
    return () => window.clearTimeout(timer);
  }, [analyzing, stage]);

  const runAnalysis = useCallback(
    (text: string, speakers: ConflictSpeaker[]) => {
      const runId = runIdRef.current + 1;
      runIdRef.current = runId;

      setSubmission({ conversation: text, speakers });
      setStage(0);
      setPhase({ kind: 'analyzing' });

      void analyze(text, speakers).then((result) => {
        if (!aliveRef.current || runIdRef.current !== runId) return;
        setPhase(
          result.ok
            ? { kind: 'result', response: result.response, speakers }
            : { kind: 'error', message: result.message },
        );
      });
    },
    [analyze],
  );

  /** Step 1 → step 2 or straight to step 3, depending on how the text reads. */
  const handleContinue = useCallback(() => {
    const text = conversation.trim();
    if (text.length === 0) return;

    const parse = parseConversation(text);
    if (readsAsConversation(parse)) {
      setUserLabel(null);
      setPhase({ kind: 'confirm', parse });
      return;
    }

    runAnalysis(text, plainSpeakers(other));
  }, [conversation, other, runAnalysis]);

  const handleConfirmSpeakers = useCallback(() => {
    if (phase.kind !== 'confirm' || userLabel === null) return;
    const speakers = withoutRedundantRoles(
      speakersFromParse(phase.parse, userLabel, { self: 'You', other }),
    );
    runAnalysis(conversation.trim(), speakers);
  }, [conversation, other, phase, runAnalysis, userLabel]);

  /**
   * The example is shown, not just loaded: it fills the box and runs, because someone asking to
   * see an example wants to see the finished thing, not a filled-in form.
   */
  const handleShowExample = useCallback(() => {
    onLoadExample();
    setConversation(example.conversation);
    setUserLabel(null);

    if (example.response === undefined) {
      runAnalysis(example.conversation, example.speakers);
      return;
    }

    // A ready response means the example costs nothing to show. Regenerate still runs for real.
    runIdRef.current += 1;
    setSubmission({ conversation: example.conversation, speakers: example.speakers });
    setPhase({ kind: 'result', response: example.response, speakers: example.speakers });
  }, [example, onLoadExample, runAnalysis]);

  const handleRetry = useCallback(() => {
    if (submission === null) return;
    runAnalysis(submission.conversation, submission.speakers);
  }, [runAnalysis, submission]);

  const backToInput = useCallback(() => {
    runIdRef.current += 1;
    setPhase({ kind: 'input' });
  }, []);

  if (phase.kind === 'confirm') {
    return (
      <section className="w-full max-w-full space-y-6">
        <SpeakerConfirmation
          parse={phase.parse}
          userLabel={userLabel}
          onSelectUser={setUserLabel}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            size="lg"
            leadingIcon={Check}
            onClick={handleConfirmSpeakers}
            disabled={userLabel === null}
          >
            That is right — continue
          </Button>
          <Button variant="ghost" size="md" leadingIcon={ArrowLeft} onClick={backToInput}>
            Change what I wrote
          </Button>
        </div>

        {userLabel === null ? (
          <p className="text-base leading-relaxed text-ink-muted">
            Pick which one is you first. It only decides which side gets labelled as yours.
          </p>
        ) : null}
      </section>
    );
  }

  if (phase.kind === 'analyzing') {
    return (
      <section aria-labelledby="repair-working-heading" className="w-full max-w-full space-y-5">
        <div className="min-w-0">
          <h2
            id="repair-working-heading"
            className="font-display text-2xl leading-tight text-ink"
          >
            Reading it through
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink-muted">
            Taking both sides seriously takes a moment. This usually lands in under a minute.
          </p>
        </div>

        <Card elevation="card">
          <CardBody>
            <ol className="space-y-2.5" aria-live="polite" aria-atomic="false" aria-busy="true">
              {STAGES.map((label, index) => {
                const done = index < stage;
                const active = index === stage;

                return (
                  <li
                    key={label}
                    className={cn(
                      'flex items-center gap-3 rounded-card border px-4 py-3',
                      'transition-colors duration-300 ease-smooth',
                      done && 'border-teal/30 bg-teal-soft',
                      active && 'border-primary/35 bg-primary-soft',
                      !done && !active && 'border-line bg-paper-sunk/50',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-chip border',
                        done && 'border-teal/40 bg-teal-soft text-teal-ink',
                        active && 'border-primary/40 bg-surface text-primary',
                        !done && !active && 'border-line-strong bg-surface text-ink-muted',
                      )}
                    >
                      {done ? (
                        <Check className="h-4 w-4" strokeWidth={3} />
                      ) : active ? (
                        <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
                      ) : null}
                    </span>

                    <span
                      className={cn(
                        'min-w-0 flex-1 text-base font-semibold leading-snug',
                        done && 'text-teal-ink',
                        active && 'text-ink',
                        !done && !active && 'text-ink-muted',
                      )}
                    >
                      {label}
                    </span>

                    <span
                      className={cn(
                        'shrink-0 text-sm font-semibold',
                        done && 'text-teal-ink',
                        active && 'text-primary',
                        !done && !active && 'text-ink-muted',
                      )}
                    >
                      {done ? 'Done' : active ? 'Working' : 'Next'}
                    </span>
                  </li>
                );
              })}
            </ol>
          </CardBody>
        </Card>
      </section>
    );
  }

  if (phase.kind === 'result') {
    const lines = leadIsAppropriate(phase.response) ? leadLines(phase.response, phase.speakers) : [];

    return (
      <section className="w-full max-w-full space-y-8">
        {lines.length > 0 ? (
          <Card tone="primary" elevation="lift" className="motion-safe:animate-reveal-up">
            <CardHeader
              eyebrow="The short version"
              title="What each of you seems to be saying"
              icon={MessageSquareHeart}
            />
            <CardBody className="space-y-5">
              <ul className="space-y-3">
                {lines.map((line) => (
                  <li key={line.speakerId} className="min-w-0">
                    <p className="font-display text-lg leading-snug text-ink">{line.name}</p>
                    <p className="mt-0.5 min-w-0 break-words text-base leading-relaxed text-ink">
                      {line.says}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="border-t border-line pt-4">
                <h3 className="font-display text-lg leading-snug text-ink">
                  What the argument is actually about
                </h3>
                <p className="mt-1 min-w-0 break-words text-base leading-relaxed text-ink">
                  {phase.response.coreProblem}
                </p>
              </div>
            </CardBody>
          </Card>
        ) : null}

        <ConflictLensResult
          response={phase.response}
          speakers={phase.speakers}
          onEditContext={backToInput}
          onRegenerate={handleRetry}
        />
      </section>
    );
  }

  if (phase.kind === 'error') {
    return (
      <section className="w-full max-w-full space-y-5">
        <ErrorFallback
          error={asDisplayError(phase.message)}
          onRetry={handleRetry}
          onUseFixture={handleShowExample}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="md" leadingIcon={ArrowLeft} onClick={backToInput}>
            Back to what I wrote
          </Button>
          <p className="text-base leading-relaxed text-ink-muted">
            Nothing you wrote was lost — it is still in the box.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="repair-start-heading" className="w-full max-w-full space-y-6">
      <div className="min-w-0">
        <h2 id="repair-start-heading" className="font-display text-2xl leading-tight text-ink">
          What happened between you and {other}?
        </h2>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink-muted">
          Show the conversation or just tell it in your own words. You will get both
          perspectives, what the argument is actually about, and something you could say next.
          Nothing here picks a winner.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="min-w-0 space-y-2">
          <h3 className="flex items-center gap-2 font-display text-lg leading-snug text-ink">
            <ImageUp aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
            Upload a screenshot
          </h3>
          <p className="text-base leading-relaxed text-ink-muted">
            A photo or screenshot of the messages. The text comes out into the box, and you can
            fix anything it read wrong.
          </p>
          <ScreenshotUpload onTranscript={setConversation} />
        </div>

        <div className="min-w-0 space-y-2">
          <h3 className="flex items-center gap-2 font-display text-lg leading-snug text-ink">
            <PenLine aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
            Describe it or paste it
          </h3>
          <p className="text-base leading-relaxed text-ink-muted">
            Paste the messages, or just write what happened. Either works — you do not need to
            tidy it up first.
          </p>
          <Card elevation="card">
            <CardBody>
              <Textarea
                label="The conversation, or what happened"
                hideLabel
                rows={10}
                value={conversation}
                onChange={(event) => setConversation(event.target.value)}
                placeholder={`We argued about the same thing again last night. I brought up the kitchen and ${other} said I was nagging…`}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Button
          variant="primary"
          size="lg"
          onClick={handleContinue}
          disabled={conversation.trim().length === 0}
        >
          Help me understand this
        </Button>
        <Button variant="ghost" size="md" onClick={handleShowExample}>
          See an example
        </Button>
      </div>
    </section>
  );
}
