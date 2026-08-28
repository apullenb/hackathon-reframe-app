import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageUp, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { CommunicationContext, ConflictLensResponse, ConflictSpeaker } from '@/types/contracts';
import type { ConflictFirstRead } from '@/schemas/conflictFirstRead';
import {
  describeImageProblem,
  extractConversationFromImage,
  fileToImagePayload,
  ACCEPTED_IMAGE_TYPES,
} from '@/ai/vision';
import { parseConversation, speakersFromParse } from '@/components/conflict/parseConversation';
import { ConflictLensResult } from '@/components/conflict';
import { Button, Card, CardBody, Textarea } from '@/components/ui';
import { cn } from '@/lib/cn';

/**
 * Repair — work out what an argument is actually about.
 *
 * Three screens, deliberately. An earlier version made the user upload, wait, accept a
 * transcript, and then ask for analysis — four decisions to get one answer. Now: put it in and
 * press Analyze; check the conversation came out right, editing any line by clicking it; ask for
 * the read. Nothing else is asked of anyone mid-argument.
 */

export type RepairExample = {
  conversation: string;
  speakers: ConflictSpeaker[];
  response?: ConflictLensResponse;
};

export type RepairViewProps = {
  otherPerson: string;
  analyze: (
    conversation: string,
    speakers: ConflictSpeaker[],
  ) => Promise<{ ok: true; response: ConflictLensResponse } | { ok: false; message: string }>;
  onLoadExample: () => void;
  firstRead?: (
    conversation: string,
    speakers: ConflictSpeaker[],
  ) => Promise<ConflictFirstRead | null>;
  example: RepairExample;
  context: Partial<CommunicationContext>;
};

type Message = { id: string; speaker: string; text: string };

type Phase =
  | { kind: 'input' }
  | { kind: 'reading' }
  | { kind: 'review' }
  | { kind: 'analyzing' }
  | { kind: 'result'; response: ConflictLensResponse; speakers: ConflictSpeaker[] }
  | { kind: 'error'; message: string };

const STAGES = [
  'Reading it through',
  'Separating what happened from what was assumed',
  'Finding where it turned',
  'Working out what it is actually about',
];
const STAGE_MS = 900;

/** Whichever label reads as the person using the app, falling back to whoever spoke first. */
function pickSelf(labels: string[]): string {
  return labels.find((l) => l.trim().toLowerCase() === 'you') ?? labels[0];
}

let seq = 0;
const nextId = () => `m${(seq += 1)}`;

/**
 * Transcription labels bubbles by position when the screenshot shows no names, which is honest
 * but unreadable on screen. Every mainstream chat app puts the device owner on the right, so map
 * it to real words — and the review screen lets the user correct it if their app is unusual.
 */
function relabel(label: string, other: string): string {
  const key = label.trim().toLowerCase();
  if (key === 'right' || key === 'me') return 'You';
  if (key === 'left' || key === 'them') return other;
  return label;
}

function toMessages(raw: string, other: string): Message[] {
  const parsed = parseConversation(raw);
  if (parsed.lines.length > 0 && parsed.problem !== 'no_speakers') {
    return parsed.lines.map((line) => ({
      id: nextId(),
      speaker: relabel(line.speakerLabel || 'You', other),
      text: line.text,
    }));
  }
  // Free-text description: keep it whole rather than forcing it into a transcript shape.
  return [{ id: nextId(), speaker: 'You', text: raw.trim() }];
}

export function RepairView({
  otherPerson,
  analyze,
  onLoadExample,
  firstRead,
  example,
  context,
}: RepairViewProps): JSX.Element {
  const other = otherPerson.trim() || 'the other person';

  const [phase, setPhase] = useState<Phase>({ kind: 'input' });
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileProblem, setFileProblem] = useState<string | null>(null);
  const [extra, setExtra] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [preview, setPreview] = useState<ConflictFirstRead | null>(null);
  const [userSpeaker, setUserSpeaker] = useState<string | null>(null);

  const runId = useRef(0);
  /** What was last sent, so "try again" replays it without rebuilding from screen state. */
  const lastRun = useRef<{ body: string; speakerSource: string } | null>(null);
  const alive = useRef(true);
  // Set on mount as well as cleared on unmount: StrictMode mounts, unmounts, and remounts, and a
  // cleanup-only guard stays false forever after that — silently dropping every result.
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Release the object URL rather than leaking it, and never keep the image around.
  useEffect(() => {
    if (!file) { setPreviewUrl(null); return undefined; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (phase.kind !== 'analyzing' || stage >= STAGES.length - 1) return undefined;
    const t = window.setTimeout(() => setStage((s) => s + 1), STAGE_MS);
    return () => window.clearTimeout(t);
  }, [phase.kind, stage]);

  const chooseFile = useCallback((picked: File | null) => {
    if (!picked) { setFile(null); setFileProblem(null); return; }
    const problem = describeImageProblem(picked);
    setFileProblem(problem);
    setFile(problem ? null : picked);
  }, []);

  /**
   * Fire the read. `transcript` is what gets analysed; `speakerSource` is what we look at to work
   * out who the two people are — the same string when it came from a conversation, and just the
   * roles when someone typed it in their own words.
   */
  const startAnalysis = useCallback(
    (body: string, speakerSource: string) => {
      const id = runId.current + 1;
      runId.current = id;
      lastRun.current = { body, speakerSource };

      const parsed = parseConversation(speakerSource);
      const speakers: ConflictSpeaker[] =
        parsed.speakerLabels.length === 2
          ? speakersFromParse(parsed, userSpeaker ?? pickSelf(parsed.speakerLabels), {
              self: context.selfRole ?? 'You',
              other: context.otherRole ?? other,
            })
          : [
              { id: 'you', label: 'You', role: context.selfRole ?? 'You', isUser: true },
              { id: 'them', label: other, role: context.otherRole ?? other, isUser: false },
            ];

      setStage(0);
      setPreview(null);
      setPhase({ kind: 'analyzing' });

      // Two calls in parallel: a short first read that lands quickly, and the full analysis
      // behind it. Nobody stares at a spinner waiting for the whole thing.
      if (firstRead) {
        void firstRead(body, speakers).then((quick) => {
          if (alive.current && runId.current === id && quick) setPreview(quick);
        });
      }
      void analyze(body, speakers).then((result) => {
        if (!alive.current || runId.current !== id) return;
        setPhase(
          result.ok
            ? { kind: 'result', response: result.response, speakers }
            : { kind: 'error', message: result.message },
        );
      });
    },
    [userSpeaker, context, other, analyze, firstRead],
  );

  /** Step 1 → step 2. Transcribes the screenshot when there is one, then shows the conversation. */
  const handleAnalyze = useCallback(async () => {
    const typed = extra.trim();
    if (!file && !typed) return;

    if (!file) {
      // Written in their own words: there is nothing to proofread, so don't invent a step. A
      // pasted transcript still gets the review screen — those are the ones that come out wrong.
      const parsed = parseConversation(typed);
      if (parsed.problem === 'no_speakers' || parsed.lines.length === 0) {
        startAnalysis(typed, '');
        return;
      }
      setMessages(toMessages(typed, other));
      setExtra('');
      setPhase({ kind: 'review' });
      return;
    }

    setPhase({ kind: 'reading' });
    const payload = await fileToImagePayload(file);
    const outcome = await extractConversationFromImage(payload);
    if (!alive.current) return;
    // The image has done its job. Drop it.
    setFile(null);

    if (!outcome.ok) {
      setPhase({ kind: 'error', message: outcome.error.userMessage });
      return;
    }
    setMessages(toMessages(outcome.value.transcript, other));
    setPhase({ kind: 'review' });
  }, [file, extra, other, startAnalysis]);

  /** Run the same input again — used by "try again" on the result. */
  const replay = useCallback(() => {
    const last = lastRun.current;
    if (last) startAnalysis(last.body, last.speakerSource);
  }, [startAnalysis]);

  /** Step 2 → step 3. */
  const handleUnderstand = useCallback(() => {
    const transcript = messages
      .map((m) => (m.speaker ? `${m.speaker}: ${m.text}` : m.text))
      .join('\n');
    const note = extra.trim();
    startAnalysis(note ? `${transcript}\n\nAlso worth knowing: ${note}` : transcript, transcript);
  }, [messages, extra, startAnalysis]);

  const showExample = useCallback(() => {
    onLoadExample();
    setMessages(toMessages(example.conversation, other));
    if (example.response) {
      setPhase({ kind: 'result', response: example.response, speakers: example.speakers });
    } else {
      setPhase({ kind: 'review' });
    }
  }, [example, onLoadExample, other]);

  const reset = useCallback(() => {
    setPhase({ kind: 'input' });
    setMessages([]);
    setExtra('');
    setFile(null);
    setPreview(null);
    setUserSpeaker(null);
  }, []);

  /* ── Result ─────────────────────────────────────────────────────────── */
  if (phase.kind === 'result') {
    return (
      <div className="space-y-5">
        <ConflictLensResult
          response={phase.response}
          speakers={phase.speakers}
          onRegenerate={replay}
          onEditContext={() => setPhase(messages.length > 0 ? { kind: 'review' } : { kind: 'input' })}
        />
        <Button variant="outline" onClick={reset}>
          Start a different one
        </Button>
      </div>
    );
  }

  /* ── Error ──────────────────────────────────────────────────────────── */
  if (phase.kind === 'error') {
    return (
      <Card tone="coral">
        <CardBody className="space-y-3">
          <h2 className="font-display text-xl text-ink">That didn’t go through</h2>
          <p className="text-sm font-medium leading-relaxed text-ink-muted">{phase.message}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setPhase(messages.length > 0 ? { kind: 'review' } : { kind: 'input' })}
            >
              {messages.length > 0 ? 'Back to the conversation' : 'Back'}
            </Button>
            <Button variant="outline" onClick={showExample}>
              Show the example instead
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  /* ── Reading the screenshot ─────────────────────────────────────────── */
  if (phase.kind === 'reading') {
    return (
      <section className="space-y-4" aria-live="polite">
        <h2 className="font-display text-2xl text-ink">Reading the screenshot</h2>
        <p className="max-w-2xl text-base leading-relaxed text-ink-muted">
          Pulling the messages out. You will get to check and fix them before anything is analysed.
        </p>
        <div className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 shadow-card">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          <span className="text-sm font-semibold text-ink">Working…</span>
        </div>
      </section>
    );
  }

  /* ── Analyzing, with the first read filling in as soon as it lands ──── */
  if (phase.kind === 'analyzing') {
    return (
      <section className="space-y-5" aria-labelledby="working">
        <div>
          <h2 id="working" className="font-display text-2xl text-ink">
            Reading it through
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink-muted">
            The first read appears as soon as it is ready, and the rest fills in behind it.
          </p>
        </div>

        {preview ? (
          <section
            aria-label="A first read"
            className="space-y-3 rounded-card border border-line bg-surface p-5 shadow-card motion-safe:animate-reveal-up"
          >
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-primary">
              A first read · still working
            </p>
            <p className="text-base font-medium leading-relaxed text-ink">
              {preview.neutralSummary}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {preview.sides.map((side) => (
                <div key={side.who} className="rounded-card border border-line bg-paper-sunk/50 p-3.5">
                  <p className="text-sm font-bold text-ink">
                    {side.who.trim().toLowerCase() === 'you'
                      ? 'What you seem to be saying'
                      : `${side.who} seems to be saying`}
                  </p>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-ink-muted">
                    {side.seemsToBeSaying}
                  </p>
                </div>
              ))}
            </div>
            <div className="rounded-card border border-teal/30 bg-teal-soft p-3.5">
              <p className="text-sm font-bold text-teal-ink">
                What it looks like it is actually about
              </p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-ink">
                {preview.likelyAbout}
              </p>
            </div>
          </section>
        ) : null}

        <Card>
          <CardBody>
            <ol className="space-y-2.5" aria-live="polite" aria-busy="true">
              {STAGES.map((label, i) => {
                const done = i < stage;
                const active = i === stage;
                return (
                  <li
                    key={label}
                    className={cn(
                      'flex items-center gap-3 rounded-card border px-4 py-3 text-sm font-semibold transition-colors',
                      done && 'border-teal/30 bg-teal-soft text-teal-ink',
                      active && 'border-primary/35 bg-primary-soft text-ink',
                      !done && !active && 'border-line text-ink-muted',
                    )}
                  >
                    {active ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                    ) : (
                      <span
                        className={cn('h-2 w-2 rounded-full', done ? 'bg-teal' : 'bg-line-strong')}
                        aria-hidden="true"
                      />
                    )}
                    {label}
                    <span className="sr-only">{done ? 'done' : active ? 'in progress' : 'waiting'}</span>
                  </li>
                );
              })}
            </ol>
          </CardBody>
        </Card>
      </section>
    );
  }

  /* ── Step 2: check the conversation ─────────────────────────────────── */
  if (phase.kind === 'review') {
    const speakers = [...new Set(messages.map((m) => m.speaker).filter(Boolean))];
    return (
      <section className="space-y-5">
        <div>
          <h2 className="font-display text-2xl text-ink">Does this look right?</h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink-muted">
            Click any message to fix it. Nothing is analysed until you say so.
          </p>
        </div>

        <ul className="space-y-2">
          {messages.map((message) => {
            const editing = editingId === message.id;
            return (
              <li key={message.id}>
                {editing ? (
                  <div className="space-y-2 rounded-card border-2 border-primary bg-surface p-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                        Who said it
                        <input
                          value={message.speaker}
                          onChange={(e) =>
                            setMessages((prev) =>
                              prev.map((m) => (m.id === message.id ? { ...m, speaker: e.target.value } : m)),
                            )
                          }
                          className="ml-2 min-h-tap rounded-card border border-line bg-paper-sunk/50 px-3 text-sm font-semibold normal-case tracking-normal text-ink"
                        />
                      </label>
                    </div>
                    <Textarea
                      label="What they said"
                      hideLabel
                      rows={2}
                      value={message.text}
                      onChange={(e) =>
                        setMessages((prev) =>
                          prev.map((m) => (m.id === message.id ? { ...m, text: e.target.value } : m)),
                        )
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => setEditingId(null)}>Done</Button>
                      <Button
                        variant="ghost"
                        leadingIcon={Trash2}
                        onClick={() => {
                          setMessages((prev) => prev.filter((m) => m.id !== message.id));
                          setEditingId(null);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingId(message.id)}
                    className="group flex min-h-tap w-full items-start gap-3 rounded-card border border-line bg-surface p-3.5 text-left shadow-card transition-colors hover:border-primary/45"
                  >
                    <span className="min-w-[5rem] shrink-0 text-sm font-bold text-primary">
                      {message.speaker || 'You'}
                    </span>
                    <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-ink">
                      {message.text}
                    </span>
                    <Pencil
                      className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden="true"
                    />
                    <span className="sr-only">Edit this message</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <Button
          variant="outline"
          leadingIcon={Plus}
          onClick={() => {
            const id = nextId();
            setMessages((prev) => [...prev, { id, speaker: other, text: '' }]);
            setEditingId(id);
          }}
        >
          Add a message
        </Button>

        {speakers.length === 2 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-card border border-line bg-surface px-4 py-3 shadow-card">
            <span className="text-sm font-bold text-ink">Which one is you?</span>
            {speakers.map((name) => {
              const selected = (userSpeaker ?? pickSelf(speakers)) === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setUserSpeaker(name)}
                  aria-pressed={selected}
                  className={cn(
                    'min-h-tap rounded-chip border px-4 text-sm font-bold transition-colors',
                    selected
                      ? 'border-primary bg-primary-soft text-primary'
                      : 'border-line-strong bg-surface text-ink-muted hover:border-primary/45',
                  )}
                >
                  {name}
                </button>
              );
            })}
          </div>
        ) : null}

        {speakers.length > 2 ? (
          <p className="rounded-card border border-amber/40 bg-amber-soft p-3.5 text-sm font-medium text-amber-ink">
            There are {speakers.length} people here. This works best with two — remove or relabel
            the extra messages, or carry on and it will treat it as you and {other}.
          </p>
        ) : null}

        <Textarea
          label="Anything else worth knowing?"
          hint="Optional. What led up to it, or what you were actually worried about."
          rows={3}
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
        />

        <div className="flex flex-wrap gap-2">
          <Button size="lg" onClick={handleUnderstand} disabled={messages.length === 0}>
            Help me understand this
          </Button>
          <Button variant="ghost" onClick={reset}>
            Start again
          </Button>
        </div>
      </section>
    );
  }

  /* ── Step 1: put it in ──────────────────────────────────────────────── */
  const ready = Boolean(file) || extra.trim().length > 0;
  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-display text-2xl text-ink">What happened between you and {other}?</h2>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink-muted">
          Add a screenshot of the conversation, or just write what happened. Nothing here picks a
          winner.
        </p>
      </div>

      <label
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card-lg border-2 border-dashed p-8 text-center transition-colors',
          file ? 'border-primary bg-primary-soft' : 'border-line-strong bg-surface hover:border-primary/50',
        )}
      >
        <input
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          className="sr-only"
          onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
        />
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt="The screenshot you added"
              className="max-h-48 rounded-card border border-line object-contain"
            />
            <span className="text-sm font-semibold text-primary">
              {file?.name} · click to replace
            </span>
          </>
        ) : (
          <>
            <ImageUp className="h-7 w-7 text-primary" aria-hidden="true" />
            <span className="text-base font-bold text-ink">Add a screenshot</span>
            <span className="max-w-sm text-sm font-medium leading-relaxed text-ink-muted">
              One image — PNG, JPEG, WebP or GIF, up to 6MB. It is sent to the AI provider to read
              the text, and is not stored.
            </span>
          </>
        )}
      </label>

      {file ? (
        <Button
          variant="ghost"
          leadingIcon={X}
          onClick={() => chooseFile(null)}
        >
          Remove screenshot
        </Button>
      ) : null}

      {fileProblem ? (
        <p className="rounded-card border border-coral/40 bg-coral-soft p-3.5 text-sm font-semibold text-coral-ink">
          {fileProblem}
        </p>
      ) : null}

      <Textarea
        label={file ? 'Anything else worth knowing?' : 'Or describe what happened'}
        hint={
          file
            ? 'Optional. What led up to it, or what you were actually worried about.'
            : 'Paste the messages, or write it in your own words. Either works.'
        }
        rows={5}
        value={extra}
        onChange={(e) => setExtra(e.target.value)}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" disabled={!ready} onClick={() => void handleAnalyze()}>
          Analyze
        </Button>
        <button
          type="button"
          onClick={showExample}
          className="min-h-tap text-sm font-semibold text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
        >
          See an example
        </button>
      </div>
      {!ready ? (
        <p className="text-sm font-medium text-ink-muted">
          Add a screenshot or describe what happened to continue.
        </p>
      ) : null}
    </section>
  );
}
