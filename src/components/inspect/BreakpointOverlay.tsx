/**
 * Breakpoint — brief §8.5. Interrupts an automatic reaction before it ships.
 *
 * The rule that shapes every line of copy here: **the countdown must never pressure the user to
 * send when it ends** (brief §8.5). So this overlay has no send control at all, at any point. When
 * the thirty seconds are up, the only offers are wait longer, save without sending, run State
 * Inspector, open Message Compiler, or leave. "Time's up" is not a starting pistol.
 *
 * Accessible dialog per brief §17: focus is trapped while open, Escape closes, and focus returns
 * to whatever had it before. The backdrop dims and blurs rather than flashing — §15 asks the
 * surrounding interface to pause gently, not to raise an alarm.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CircleCheck,
  CirclePause,
  DoorOpen,
  Gauge,
  Save,
  Timer,
  X,
} from 'lucide-react';
import { Badge, Button, Card, CardBody, Chip, Textarea } from '@/components/ui';
import { featureById } from '@/features/registry';
import { cn } from '@/lib/cn';
import type { CurrentSituation } from '@/situation/types';
import type { SituationAction } from '@/situation/reducer';

type BreakpointOverlayProps = {
  situation: CurrentSituation;
  dispatch: React.Dispatch<SituationAction>;
  open: boolean;
  onClose: () => void;
};

const PAUSE_SECONDS = 30;

/** Question 1. Free text is always available underneath. */
const ABOUT_TO = [
  'Send a reply',
  'Say it out loud',
  'Post it publicly',
  'Call them',
  'Nothing yet — I am deciding',
] as const;

const INTENSITY_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Barely registering',
  2: 'Noticeable',
  3: 'Running in the background',
  4: 'Loud',
  5: 'Driving the decision',
};

/** Question 4. */
const TIMING = [
  { id: 'now', label: 'Respond now' },
  { id: 'draft', label: 'Save a draft' },
  { id: 'wait', label: 'Wait' },
] as const;

type Timing = (typeof TIMING)[number]['id'];

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function BreakpointOverlay({
  situation,
  dispatch,
  open,
  onClose,
}: BreakpointOverlayProps): JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = `${titleId}-description`;

  const [aboutTo, setAboutTo] = useState<string>('');
  const [aboutToOwn, setAboutToOwn] = useState('');
  const [timing, setTiming] = useState<Timing | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const humorOn = !situation.safety.seriousMode && situation.humorLevel !== 'off';
  const finished = remaining === 0;
  const running = remaining !== null && remaining > 0;

  /* Focus management: trap while open, restore on close. */
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = dialogRef.current;
    const first = node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus();
    return () => {
      restoreRef.current?.focus();
    };
  }, [open]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const node = dialogRef.current;
      if (!node) return;
      const focusable = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === node)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  /* The countdown. It counts, and then it stops. It does not do anything else. */
  useEffect(() => {
    if (remaining === null || remaining <= 0) return;
    const timer = window.setTimeout(() => setRemaining(remaining - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining]);

  useEffect(() => {
    if (!open) {
      setRemaining(null);
      setSaved(false);
    }
  }, [open]);

  if (!open) return null;

  const startPause = (): void => {
    setSaved(false);
    setRemaining(PAUSE_SECONDS);
  };

  const saveWithoutSending = (): void => {
    const intent = aboutToOwn.trim() || aboutTo;
    if (intent) dispatch({ type: 'set_action_urge', urge: intent });
    dispatch({ type: 'mark_tool', tool: 'breakpoint', status: 'complete' });
    setSaved(true);
  };

  const openTool = (tool: 'state_inspector' | 'message_compiler'): void => {
    const feature = featureById(tool);
    dispatch({ type: 'open_tool', tool, workspace: feature.workspace });
    onClose();
  };

  /* Coarse status text, so a screen reader is not read a number every second. */
  const countdownStatus = finished
    ? 'The thirty seconds are up. Nothing was sent.'
    : running
      ? remaining > 20
        ? 'Pause started. Thirty seconds.'
        : remaining > 10
          ? 'About twenty seconds left.'
          : 'About ten seconds left.'
      : '';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-surface-ink/60 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="w-full max-w-2xl motion-safe:animate-reveal-up"
      >
        <Card elevation="lift" className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/80 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary-soft text-primary"
              >
                <CirclePause className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  Breakpoint
                </p>
                <h2
                  id={titleId}
                  className="font-display text-xl font-semibold leading-tight tracking-tight text-ink"
                >
                  Execution paused
                </h2>
              </div>
            </div>
            <Button variant="ghost" leadingIcon={X} onClick={onClose}>
              Exit without judgement
            </Button>
          </div>

          <CardBody className="flex flex-col gap-5">
            <p id={descriptionId} className="text-base leading-relaxed text-ink-muted">
              Four questions. None of them are a test, and nothing here sends anything. You can
              close this at any point and nothing is lost.
            </p>
            {humorOn ? (
              <p className="font-mono text-base leading-relaxed text-ink">
                Breakpoint hit before production impact.
              </p>
            ) : null}

            {/* Q1 */}
            <fieldset className="flex flex-col gap-2">
              <legend className="font-display text-lg font-semibold tracking-tight text-ink">
                1. What are you about to do?
              </legend>
              <div className="flex flex-wrap gap-2">
                {ABOUT_TO.map((option) => (
                  <Chip
                    key={option}
                    selected={aboutTo === option}
                    onSelect={() => setAboutTo(aboutTo === option ? '' : option)}
                  >
                    {option}
                  </Chip>
                ))}
              </div>
              <Textarea
                label="Or say it in your own words"
                rows={2}
                value={aboutToOwn}
                onChange={(event) => setAboutToOwn(event.target.value)}
              />
            </fieldset>

            {/* Q2 */}
            <fieldset className="flex flex-col gap-2">
              <legend className="font-display text-lg font-semibold tracking-tight text-ink">
                2. How intense is the reaction?
              </legend>
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
                        'flex min-h-tap min-w-[7rem] flex-col items-start gap-0.5 rounded-card border px-4 py-2.5 text-left shadow-card',
                        'transition-[box-shadow,background-color,border-color,color] duration-200 ease-smooth',
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
            </fieldset>

            {/* Q3 */}
            <div className="flex flex-col gap-2">
              <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
                3. What result do you want?
              </h3>
              <Textarea
                label="What result do you want?"
                hideLabel
                hint="Not the line you want to deliver. What you want to be true in an hour."
                rows={2}
                value={situation.desiredOutcome ?? ''}
                onChange={(event) =>
                  dispatch({ type: 'set_text', patch: { desiredOutcome: event.target.value } })
                }
              />
            </div>

            {/* Q4 */}
            <fieldset className="flex flex-col gap-2">
              <legend className="font-display text-lg font-semibold tracking-tight text-ink">
                4. Respond now, save a draft, or wait?
              </legend>
              <div className="flex flex-wrap gap-2">
                {TIMING.map((option) => (
                  <Chip
                    key={option.id}
                    selected={timing === option.id}
                    onSelect={() => setTiming(timing === option.id ? null : option.id)}
                  >
                    {option.label}
                  </Chip>
                ))}
              </div>
              {timing === 'now' ? (
                <p className="text-sm leading-relaxed text-ink-muted">
                  Fine. Breakpoint does not send anything either way — it just wanted you to have
                  picked, rather than to have arrived there.
                </p>
              ) : null}
            </fieldset>

            {/* The pause */}
            <Card tone="sunk" elevation="flat">
              <CardBody className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-ink">
                    <Timer aria-hidden="true" className="h-[18px] w-[18px] text-primary" />
                    Thirty-second pause
                  </h3>
                  {remaining !== null ? (
                    <Badge tone={finished ? 'teal' : 'primary'} size="md">
                      <span aria-hidden="true">{`${remaining}s`}</span>
                      <span className="sr-only">
                        {finished ? 'Pause finished' : `${remaining} seconds remaining`}
                      </span>
                    </Badge>
                  ) : null}
                </div>

                <p aria-live="polite" className="text-base leading-relaxed text-ink">
                  {countdownStatus}
                </p>

                {finished ? (
                  <p className="text-base leading-relaxed text-ink">
                    Nothing needs to happen now. The timer running out is not a cue to send — it was
                    thirty seconds, and thirty seconds is not a deadline. Wait longer, save this, or
                    close it and come back.
                  </p>
                ) : null}

                {remaining === null ? (
                  <p className="text-base leading-relaxed text-ink-muted">
                    Thirty seconds, no send button at the end of it. The timer exists so the next
                    move is a decision instead of a reflex.
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" leadingIcon={CirclePause} onClick={startPause}>
                    {finished ? 'Wait another thirty seconds' : running ? 'Restart the pause' : 'Start a 30-second pause'}
                  </Button>
                </div>
              </CardBody>
            </Card>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                What now
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" leadingIcon={Save} onClick={saveWithoutSending}>
                  Save without sending
                </Button>
                <Button
                  variant="outline"
                  leadingIcon={Gauge}
                  onClick={() => openTool('state_inspector')}
                >
                  Run State Inspector
                </Button>
                <Button
                  variant="outline"
                  leadingIcon={featureById('message_compiler').icon}
                  onClick={() => openTool('message_compiler')}
                >
                  Open Message Compiler
                </Button>
                <Button variant="ghost" leadingIcon={DoorOpen} onClick={onClose}>
                  Exit without judgement
                </Button>
              </div>
              <p aria-live="polite" className="text-base leading-relaxed text-ink">
                {saved ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-teal-ink">
                    <CircleCheck aria-hidden="true" className="h-4 w-4" />
                    Kept in this session. Nothing was sent, and nothing will be.
                  </span>
                ) : (
                  ''
                )}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>,
    document.body,
  );
}
