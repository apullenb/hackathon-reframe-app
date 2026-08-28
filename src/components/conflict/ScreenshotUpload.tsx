/**
 * ScreenshotUpload — spec §19, the optional path into Conflict Lens.
 *
 * The shape of the step, in order: pick one image → see it locally → send it to the configured
 * provider for transcription → read the transcript back and FIX it → explicitly hand it to the
 * parent. Nothing is analysed on the way through; this control produces text and stops.
 *
 * Two decisions worth stating plainly, both from spec §19:
 *
 * - The transcript lands in a real `<textarea>`, not a read-only panel. A vision model misreads
 *   names, clips the top of a thread, and merges turns. The correction step is the point, so it
 *   has to be editable, and the accept action sends whatever is in the field at that moment.
 * - The image is held only as long as the preview needs it (step 7). On a successful read the
 *   File and its object URL are dropped immediately and the object URL is revoked in an effect
 *   cleanup. It is kept across a *failed* read for one reason: "try again" needs something to
 *   retry. Nothing is ever written to `localStorage` or `sessionStorage`, and nothing here logs
 *   the image, the transcript, or any message content.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CircleDashed,
  CheckCircle2,
  ImageUp,
  ScanText,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  ACCEPTED_IMAGE_TYPES,
  describeImageProblem,
  extractConversationFromImage,
  fileToImagePayload,
} from '@/ai/vision';
import type { ImagePayload } from '@/ai/vision';
import { aiError } from '@/ai/types';
import type { ScreenshotExtraction } from '@/schemas/screenshot';
import type { ContextSwitchError } from '@/types/contracts';
import { Badge, Button, Card, CardBody, CardHeader, Textarea } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { ErrorFallback } from '@/components/shared';
import { cn } from '@/lib/cn';

export type ScreenshotUploadProps = {
  /** Called when the user accepts the transcript. The parent puts it into the conversation field. */
  onTranscript: (transcript: string) => void;
  /** True while the parent is busy; the control should not start a new extraction. */
  disabled?: boolean;
  className?: string;
};

/** Where the control is in the four-step sequence. */
type Status = 'empty' | 'ready' | 'reading' | 'failed' | 'review';

type Chosen = { file: File; previewUrl: string };

/**
 * Staged wait copy (spec §25 — never a bare spinner). The stages run on a timer because a
 * single non-streaming vision call reports no intermediate progress; naming the steps honestly
 * beats inventing a percentage. The last line stays put and says how long this can take.
 */
const READING_STAGES = [
  'Uploading the screenshot to the AI provider…',
  'Reading the messages and working out who said what…',
  'Putting the turns in order, oldest first…',
  'Still going — a long or dense screenshot can take up to 45 seconds.',
] as const;

const STAGE_MS = 7_000;

/** Icon AND word for every level, plus its own tinted note — never colour alone (spec §24). */
const confidenceView: Record<
  ScreenshotExtraction['confidence'],
  { icon: LucideIcon; tone: BadgeTone; label: string; note: string; chrome: string }
> = {
  high: {
    icon: CheckCircle2,
    tone: 'teal',
    label: 'High confidence',
    note: 'This read should be close. Skim it anyway — names are the easiest thing to get wrong.',
    chrome: 'border-teal/30 bg-teal-soft',
  },
  medium: {
    icon: CircleDashed,
    tone: 'amber',
    label: 'Medium confidence',
    note: 'Parts of this may be off. Read it against the screenshot before you use it.',
    chrome: 'border-amber/40 bg-amber-soft',
  },
  low: {
    icon: AlertTriangle,
    tone: 'coral',
    label: 'Low confidence',
    note: 'This screenshot was hard to read. Treat the text below as a rough draft and correct anything that is wrong — or close this and paste the conversation as text instead.',
    chrome: 'border-coral/45 bg-coral-soft',
  },
};

/** Kilobyte-free, one decimal, no message content. */
function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb < 0.1 ? '<0.1MB' : `${mb.toFixed(1)}MB`;
}

export function ScreenshotUpload({
  onTranscript,
  disabled = false,
  className,
}: ScreenshotUploadProps): JSX.Element {
  const [status, setStatus] = useState<Status>('empty');
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const [error, setError] = useState<ContextSwitchError | null>(null);
  const [extraction, setExtraction] = useState<ScreenshotExtraction | null>(null);
  const [draft, setDraft] = useState('');
  const [stage, setStage] = useState(0);
  const [notice, setNotice] = useState('');
  const [dragging, setDragging] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const runIdRef = useRef(0);
  const generatedId = useId();
  const inputId = `screenshot-file-${generatedId}`;

  const previewUrl = chosen?.previewUrl ?? null;

  // Step 7: every object URL this component creates is revoked here — on replacement and on
  // unmount — so a dropped image leaves nothing behind.
  useEffect(() => {
    if (previewUrl === null) return undefined;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  // An in-flight read must not outlive the component.
  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (status !== 'reading') return undefined;
    if (stage >= READING_STAGES.length - 1) return undefined;
    const timer = window.setTimeout(() => setStage((current) => current + 1), STAGE_MS);
    return () => window.clearTimeout(timer);
  }, [status, stage]);

  const selectFile = useCallback((file: File) => {
    const problem = describeImageProblem(file);
    if (problem !== null) {
      // Rejected locally — no upload attempted.
      setRejection(problem);
      setChosen(null);
      setError(null);
      setStatus('empty');
      return;
    }
    setRejection(null);
    setError(null);
    setExtraction(null);
    setNotice('');
    setChosen({ file, previewUrl: URL.createObjectURL(file) });
    setStatus('ready');
  }, []);

  /**
   * Pasting a screenshot straight in is the natural gesture for this feature, so it is wired at
   * the document level — but only while this control is idle, never over a real text field, and
   * only for an actual image. The file input remains the primary, keyboard-reachable path.
   */
  useEffect(() => {
    if (disabled || status === 'reading' || status === 'review') return undefined;

    const onPaste = (event: ClipboardEvent): void => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest('input, textarea, [contenteditable]') !== null)
      ) {
        return;
      }
      const files = event.clipboardData?.files;
      const image = files ? Array.from(files).find((f) => f.type.startsWith('image/')) : undefined;
      if (image === undefined) return;
      event.preventDefault();
      selectFile(image);
    };

    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [disabled, status, selectFile]);

  function discardImage(): void {
    setChosen(null);
    setError(null);
    setRejection(null);
    setStatus('empty');
    setNotice('Screenshot removed.');
  }

  function cancelReading(): void {
    cancelledRef.current = true;
    controllerRef.current?.abort();
  }

  async function startReading(): Promise<void> {
    if (disabled || chosen === null) return;

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    const controller = new AbortController();
    controllerRef.current = controller;
    cancelledRef.current = false;

    setStatus('reading');
    setStage(0);
    setError(null);
    setNotice('');

    let payload: ImagePayload;
    try {
      payload = await fileToImagePayload(chosen.file);
    } catch {
      if (runId !== runIdRef.current) return;
      setError(
        aiError('network', {
          userMessage:
            'That image could not be opened on this device. Try a different screenshot, or paste the conversation as text instead.',
          detail: 'image could not be read locally',
        }),
      );
      setStatus('failed');
      return;
    }

    const result = await extractConversationFromImage(payload, { signal: controller.signal });
    if (runId !== runIdRef.current) return;

    if (result.ok) {
      setExtraction(result.value);
      setDraft(result.value.transcript);
      setStatus('review');
      // Step 7: the request is done, so the image goes now. The effect above revokes the URL.
      setChosen(null);
      setNotice('Screenshot read. Check the text below before using it.');
      return;
    }

    if (cancelledRef.current) {
      // A user cancel arrives as an abort; it is not a failure, so it does not read as one.
      setStatus('ready');
      setNotice('Reading cancelled. The screenshot is still here if you want to try again.');
      return;
    }

    setError(result.error);
    setStatus('failed');
    setNotice('The screenshot could not be read.');
  }

  function accept(): void {
    // Step 5: whatever is in the field right now — not the model's original transcript.
    const value = draft.trim();
    if (value.length === 0) return;
    onTranscript(value);
    setExtraction(null);
    setDraft('');
    setStatus('empty');
    setNotice('Added to the conversation field below.');
  }

  function startOver(): void {
    setExtraction(null);
    setDraft('');
    setStatus('empty');
    setNotice('');
  }

  const inert = disabled || status === 'reading';
  const liveMessage = status === 'reading' ? READING_STAGES[stage] : notice;

  /** The real file input plus its label — the keyboard and screen-reader path (spec §24). */
  function picker(variant: 'zone' | 'inline'): JSX.Element {
    const isZone = variant === 'zone';

    return (
      <div>
        <input
          id={inputId}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          disabled={inert}
          className="peer sr-only"
          onChange={(event) => {
            const input = event.currentTarget;
            const file = input.files?.[0] ?? null;
            // Reset so re-picking the same file fires a change event again.
            input.value = '';
            if (file !== null) selectFile(file);
          }}
        />
        <label
          htmlFor={inputId}
          onDragOver={(event) => {
            event.preventDefault();
            if (!inert) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (inert) return;
            const file = event.dataTransfer.files?.[0];
            if (file !== undefined) selectFile(file);
          }}
          className={cn(
            'flex cursor-pointer items-center font-semibold text-ink transition-[background-color,border-color,box-shadow] duration-200 ease-smooth',
            'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-primary-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-paper',
            isZone
              ? 'min-h-[132px] flex-col justify-center gap-2 rounded-card border border-dashed border-line-strong bg-paper-sunk/50 px-5 py-6 text-center hover:border-primary-ring hover:bg-primary-soft/40'
              : 'min-h-tap justify-center gap-2 rounded-xl border border-line-strong bg-surface px-5 py-2.5 text-base shadow-card hover:border-primary-ring hover:text-primary',
            dragging && 'border-primary-ring bg-primary-soft/60',
            inert && 'cursor-not-allowed opacity-60',
          )}
        >
          <ImageUp aria-hidden="true" className={cn('shrink-0', isZone ? 'h-7 w-7' : 'h-5 w-5')} />
          {isZone ? (
            <>
              <span className="text-base">Choose a screenshot</span>
              <span className="text-sm font-normal leading-relaxed text-ink-muted">
                One image at a time. Drag one here or paste one from your clipboard. PNG, JPEG,
                WebP, or GIF, up to 6MB.
              </span>
            </>
          ) : (
            <span>Choose a different image</span>
          )}
        </label>
      </div>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)} aria-busy={status === 'reading' || undefined}>
      <CardHeader
        eyebrow="Optional"
        title="Read a screenshot"
        icon={ScanText}
        actions={
          status === 'review' ? (
            <Badge tone="slate" icon={Check} size="sm">
              Image discarded
            </Badge>
          ) : null
        }
      />

      <CardBody className="space-y-4">
        {/* Persistent live region: stage text while reading, status notices otherwise. */}
        <p aria-live="polite" className="sr-only">
          {liveMessage}
        </p>

        {/* Spec §19 step 8 / §20 — accurate, restrained, and it does not claim on-device OCR. */}
        <p className="text-sm leading-relaxed text-ink-muted">
          Reading a screenshot uploads it to the configured AI provider — there is no on-device
          text recognition here. Reframe discards the image after the request and never
          writes it to browser storage, so avoid uploading anything you would not want processed
          by that provider.
        </p>

        {status === 'empty' ? (
          <>
            {picker('zone')}
            {rejection !== null ? (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-card border border-coral/45 bg-coral-soft px-4 py-3 text-sm font-semibold leading-relaxed text-coral-ink"
              >
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                {rejection}
              </p>
            ) : null}
            {notice !== '' ? (
              <p className="text-sm leading-relaxed text-ink-muted">{notice}</p>
            ) : null}
          </>
        ) : null}

        {chosen !== null && previewUrl !== null ? (
          <div className="space-y-4">
            <figure className="space-y-2">
              <img
                src={previewUrl}
                alt="Preview of the screenshot you selected, shown before it is read."
                className="max-h-72 w-full rounded-card border border-line bg-paper-sunk object-contain"
              />
              <figcaption className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-sm text-ink-muted">
                  {chosen.file.name} · {formatSize(chosen.file.size)}
                </span>
              </figcaption>
            </figure>

            {status === 'reading' ? (
              <div className="space-y-3 rounded-card border border-line bg-paper-sunk/60 px-4 py-4">
                <p className="flex items-start gap-2 text-base font-semibold leading-relaxed text-ink">
                  <ScanText
                    aria-hidden="true"
                    className="mt-0.5 h-5 w-5 shrink-0 motion-safe:animate-pulse"
                  />
                  {READING_STAGES[stage]}
                </p>
                <ol className="space-y-1">
                  {READING_STAGES.slice(0, 3).map((label, index) => (
                    <li
                      key={label}
                      className={cn(
                        'flex items-center gap-2 text-sm leading-relaxed',
                        index <= stage ? 'text-ink' : 'text-ink-muted',
                      )}
                    >
                      <span className="font-mono text-sm font-semibold uppercase tracking-[0.08em]">
                        {index < stage ? 'Done' : index === stage ? 'Working' : 'Queued'}
                      </span>
                      <span className="min-w-0">{label}</span>
                    </li>
                  ))}
                </ol>
                <Button variant="outline" size="md" leadingIcon={X} onClick={cancelReading}>
                  Cancel reading
                </Button>
              </div>
            ) : null}

            {/* The error card owns "try again" here, so the row below never duplicates it. */}
            {status === 'failed' && error !== null ? (
              <ErrorFallback
                error={error}
                onRetry={() => {
                  void startReading();
                }}
              />
            ) : null}

            {status !== 'reading' ? (
              <div className="flex flex-wrap items-center gap-3">
                {status === 'ready' ? (
                  <Button
                    variant="primary"
                    size="md"
                    leadingIcon={ScanText}
                    disabled={inert}
                    onClick={() => {
                      void startReading();
                    }}
                  >
                    Read this screenshot
                  </Button>
                ) : null}
                {picker('inline')}
                <Button variant="ghost" size="md" leadingIcon={Trash2} onClick={discardImage}>
                  Remove
                </Button>
              </div>
            ) : null}

            {status === 'ready' && notice !== '' ? (
              <p className="text-sm leading-relaxed text-ink-muted">{notice}</p>
            ) : null}
          </div>
        ) : null}

        {status === 'review' && extraction !== null ? (
          <ReviewPanel
            extraction={extraction}
            draft={draft}
            onDraftChange={setDraft}
            onAccept={accept}
            onStartOver={startOver}
            disabled={disabled}
          />
        ) : null}
      </CardBody>
    </Card>
  );
}

/** The correction step (spec §19 steps 4–6): editable text, honest confidence, explicit accept. */
function ReviewPanel({
  extraction,
  draft,
  onDraftChange,
  onAccept,
  onStartOver,
  disabled,
}: {
  extraction: ScreenshotExtraction;
  draft: string;
  onDraftChange: (value: string) => void;
  onAccept: () => void;
  onStartOver: () => void;
  disabled: boolean;
}): JSX.Element {
  const view = confidenceView[extraction.confidence];
  const speakerCount = extraction.speakers.length;

  return (
    <div className="space-y-4 motion-safe:animate-reveal-up">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={view.tone} icon={view.icon} size="sm">
          <span className="sr-only">Screenshot read: </span>
          {view.label}
        </Badge>
        {speakerCount > 0 ? (
          <Badge tone="slate" icon={Users} size="sm">
            {speakerCount === 1 ? '1 speaker found' : `${speakerCount} speakers found`}
          </Badge>
        ) : null}
      </div>

      <p
        className={cn(
          'flex items-start gap-2 rounded-card border px-4 py-3 text-sm leading-relaxed text-ink',
          view.chrome,
        )}
      >
        <view.icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{view.note}</span>
      </p>

      {extraction.caveats.length > 0 ? (
        <div className="rounded-card border border-line bg-paper-sunk/60 px-4 py-3">
          <p className="text-sm font-semibold text-ink">Worth checking</p>
          <ul className="mt-1.5 space-y-1.5">
            {extraction.caveats.map((caveat) => (
              <li key={caveat} className="flex items-start gap-2 text-sm leading-relaxed text-ink">
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-chip bg-ink-muted" />
                <span className="min-w-0">{caveat}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {speakerCount > 2 ? (
        <p className="flex items-start gap-2 rounded-card border border-amber/40 bg-amber-soft px-4 py-3 text-sm leading-relaxed text-ink">
          <Users aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            This build maps two-person conversations. {speakerCount} speakers came through (
            {extraction.speakers.join(', ')}). Trim the text below to the two people involved, or
            relabel the lines so each one belongs to one of the two.
          </span>
        </p>
      ) : null}

      {speakerCount === 1 ? (
        <p className="flex items-start gap-2 rounded-card border border-amber/40 bg-amber-soft px-4 py-3 text-sm leading-relaxed text-ink">
          <Users aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Only one speaker label came through ({extraction.speakers[0]}). Conflict Lens needs
            two, in the form “Name: message” — add the other person’s lines below before you use
            this.
          </span>
        </p>
      ) : null}

      <Textarea
        label="Extracted conversation"
        hint="Correct anything that was misread — names, punctuation, cut-off words, turns that ran together. Nothing is analysed until you choose to use it."
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        rows={10}
        showCount
        className="font-mono"
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          size="md"
          leadingIcon={Check}
          disabled={disabled || draft.trim().length === 0}
          onClick={onAccept}
        >
          Use this conversation
        </Button>
        <Button variant="outline" size="md" leadingIcon={ImageUp} onClick={onStartOver}>
          Read another screenshot
        </Button>
      </div>
    </div>
  );
}
