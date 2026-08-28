import { useEffect, useState } from 'react';
import type { Dispatch, ReactNode } from 'react';
import {
  Check,
  ChevronDown,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { featureById } from '@/features/registry';
import type { ClaimKind, SituationAction } from '@/situation/reducer';
import type { Claim, CurrentSituation } from '@/situation/types';
import { CrossFeatureTrace } from './CrossFeatureTrace';

/**
 * The right-hand Current Situation drawer (brief §6.4).
 *
 * The drawer exists to make one distinction impossible to miss: what the user has confirmed
 * versus what a tool merely suggested (brief §2.4, §2.6). Those two lists never share a
 * treatment — different section, different ground, solid versus dashed keyline, different icon,
 * and an explicit written label on every row, so the difference survives colour blindness, a
 * greyscale projector and a screen reader alike. Suggested rows also name the tool that produced
 * them, because an unattributed suggestion is indistinguishable from a fact the user forgot.
 */

export type CurrentSituationDrawerProps = {
  situation: CurrentSituation;
  dispatch: Dispatch<SituationAction>;
  /** `panel` is the desktop and tablet column; `sheet` is the mobile bottom sheet. */
  presentation?: 'panel' | 'sheet';
  className?: string;
};

/** At desktop the drawer sits in the layout; below it, it is an overlay that starts closed. */
const DESKTOP_QUERY = '(min-width: 1024px)';

const KIND_LABEL: Record<ClaimKind, string> = {
  facts: 'Fact',
  assumptions: 'Assumption',
  feelings: 'Feeling',
};

type TaggedClaim = { claim: Claim; kind: ClaimKind };

function collect(situation: CurrentSituation): TaggedClaim[] {
  return (['facts', 'assumptions', 'feelings'] as ClaimKind[]).flatMap((kind) =>
    situation[kind].map((claim) => ({ claim, kind })),
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="border-t border-line/70 px-4 py-3 first:border-t-0">
      <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        {title}
      </h3>
      {hint ? <p className="mt-0.5 text-xs font-medium text-ink-muted">{hint}</p> : null}
      <div className="mt-2">{children}</div>
    </section>
  );
}

function EmptyLine({ children }: { children: ReactNode }): JSX.Element {
  return (
    <p className="rounded-card border border-dashed border-line bg-paper-sunk px-3 py-2 text-sm font-medium leading-relaxed text-ink-muted">
      {children}
    </p>
  );
}

/** Editorial body copy — never monospace, this is the user's own language (brief §5.3). */
function Quote({ label, text }: { label?: string; text: string }): JSX.Element {
  return (
    <div className="rounded-card border border-line bg-surface px-3 py-2">
      {label ? (
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          {label}
        </p>
      ) : null}
      <p className="mt-0.5 whitespace-pre-wrap text-sm font-medium leading-relaxed text-ink">{text}</p>
    </div>
  );
}

function ConfirmedRow({ entry }: { entry: TaggedClaim }): JSX.Element {
  return (
    <li className="flex items-start gap-2 rounded-card border border-teal/35 bg-teal-soft px-3 py-2">
      <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-teal-ink" />
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-relaxed text-ink">
          {entry.claim.userWording ?? entry.claim.text}
        </span>
        <span className="mt-0.5 block font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-ink">
          {`${KIND_LABEL[entry.kind]} · Confirmed by you`}
        </span>
      </span>
    </li>
  );
}

function SuggestedRow({ entry }: { entry: TaggedClaim }): JSX.Element {
  const source = entry.claim.source ? featureById(entry.claim.source).name : 'a tool';
  return (
    <li className="flex items-start gap-2 rounded-card border border-dashed border-amber/50 bg-amber-soft px-3 py-2">
      <Sparkles aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-ink" />
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-relaxed text-ink">{entry.claim.text}</span>
        <span className="mt-0.5 block font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-ink">
          {`${KIND_LABEL[entry.kind]} · Suggested, not confirmed · from ${source}`}
        </span>
      </span>
    </li>
  );
}

function SituationSections({
  situation,
  dispatch,
}: {
  situation: CurrentSituation;
  dispatch: Dispatch<SituationAction>;
}): JSX.Element {
  const claims = collect(situation);
  const confirmed = claims.filter((entry) => entry.claim.state === 'confirmed');
  const suggested = claims.filter((entry) => entry.claim.state === 'suggested');
  const { roles } = situation;

  return (
    <div className="pb-4">
      {situation.originalEvent ? (
        <Section title="Original event">
          <Quote text={situation.originalEvent} />
        </Section>
      ) : null}

      {situation.rawOutgoingMessage || situation.incomingMessage || situation.conversation?.length ? (
        <Section title="Raw message or incoming signal">
          <div className="flex flex-col gap-2">
            {situation.rawOutgoingMessage ? (
              <Quote label="What you wanted to send" text={situation.rawOutgoingMessage} />
            ) : null}
            {situation.incomingMessage ? (
              <Quote label="What they sent" text={situation.incomingMessage} />
            ) : null}
            {situation.conversation?.length ? (
              <p className="text-xs font-medium text-ink-muted">
                {`${situation.conversation.length} conversation turns loaded.`}
              </p>
            ) : null}
          </div>
        </Section>
      ) : null}

      <Section title="Roles">
        <dl className="flex flex-col gap-1.5 font-mono text-xs">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="font-semibold uppercase tracking-[0.12em] text-ink-muted">I am</dt>
            <dd className="min-w-0 truncate text-right font-semibold text-ink">{roles.user}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="font-semibold uppercase tracking-[0.12em] text-ink-muted">Talking to</dt>
            <dd className="min-w-0 truncate text-right font-semibold text-ink">{roles.recipient}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="font-semibold uppercase tracking-[0.12em] text-ink-muted">Relationship</dt>
            <dd className="min-w-0 truncate text-right font-semibold text-ink">{roles.relationship}</dd>
          </div>
        </dl>
      </Section>

      <Section title="Channel and goal">
        <dl className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 font-mono text-xs">
            <dt className="font-semibold uppercase tracking-[0.12em] text-ink-muted">Channel</dt>
            <dd className="min-w-0 truncate text-right font-semibold text-ink">{roles.channel}</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              Goal
            </dt>
            <dd className="text-sm font-medium leading-relaxed text-ink">
              {situation.goal ?? situation.desiredOutcome ?? (
                <span className="text-ink-muted">Not set yet.</span>
              )}
            </dd>
          </div>
        </dl>
      </Section>

      <Section title="Confirmed facts" hint="You said these are true.">
        {confirmed.length === 0 ? (
          <EmptyLine>Nothing confirmed yet. Tools cannot confirm anything on your behalf.</EmptyLine>
        ) : (
          <ul className="flex list-none flex-col gap-2">
            {confirmed.map((entry) => (
              <ConfirmedRow key={entry.claim.id} entry={entry} />
            ))}
          </ul>
        )}
      </Section>

      <Section title="Suggested but unconfirmed" hint="A tool proposed these. They are not facts.">
        {suggested.length === 0 ? (
          <EmptyLine>No open suggestions.</EmptyLine>
        ) : (
          <ul className="flex list-none flex-col gap-2">
            {suggested.map((entry) => (
              <SuggestedRow key={entry.claim.id} entry={entry} />
            ))}
          </ul>
        )}
      </Section>

      <Section title="Current compiled draft">
        {situation.compiledDraft ? (
          <Quote text={situation.compiledDraft} />
        ) : (
          <EmptyLine>No draft compiled yet.</EmptyLine>
        )}
      </Section>

      <Section title="Tools already run">
        <CrossFeatureTrace situation={situation} dispatch={dispatch} orientation="vertical" />
      </Section>
    </div>
  );
}

/** Counts shown on the collapsed rail and the mobile handle. */
function computeCounts(situation: CurrentSituation): { confirmed: number; suggested: number; run: number } {
  const claims = collect(situation);
  return {
    confirmed: claims.filter((entry) => entry.claim.state === 'confirmed').length,
    suggested: claims.filter((entry) => entry.claim.state === 'suggested').length,
    run: situation.trace.filter((frame) => frame.status === 'complete' || frame.status === 'active').length,
  };
}

export function CurrentSituationDrawer({
  situation,
  dispatch,
  presentation = 'panel',
  className,
}: CurrentSituationDrawerProps): JSX.Element {
  // The panel starts open on desktop only. Below that it would cover the workspace it is meant
  // to annotate, so it opens as an overlay on demand instead.
  const [open, setOpen] = useState(
    () => presentation === 'panel' && window.matchMedia(DESKTOP_QUERY).matches,
  );
  const counts = computeCounts(situation);

  useEffect(() => {
    if (presentation !== 'panel') return undefined;
    const query = window.matchMedia(DESKTOP_QUERY);
    const onChange = (event: MediaQueryListEvent): void => setOpen(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [presentation]);

  // Escape closes the overlay forms of the drawer without trapping focus, which keeps it a
  // non-modal region: everything behind it stays reachable.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const summary = `${counts.confirmed} confirmed · ${counts.suggested} suggested · ${counts.run} tools run`;

  if (presentation === 'sheet') {
    return (
      <section
        aria-label="Current situation"
        className={cn(
          'fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-40',
          'border-t border-line bg-paper-sunk shadow-lift',
          className,
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className="flex min-h-tap w-full items-center justify-between gap-3 px-4 py-2 text-left"
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold tracking-tight text-ink">
              Current Situation
            </span>
            <span className="block truncate font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              {summary}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'h-5 w-5 shrink-0 text-ink-muted transition-transform duration-200 ease-smooth',
              open && 'rotate-180',
            )}
          />
        </button>

        {open ? (
          <div className="max-h-[60dvh] overflow-y-auto border-t border-line">
            <SituationSections situation={situation} dispatch={dispatch} />
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <aside
      aria-label="Current situation"
      className={cn(
        'sticky top-[3.75rem] z-30 h-[calc(100dvh-3.75rem)] shrink-0 self-start',
        'transition-[width] duration-200 ease-smooth',
        open ? 'w-14 lg:w-[22rem]' : 'w-14',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-full flex-col border-l border-line bg-paper-sunk',
          open
            ? 'absolute inset-y-0 right-0 w-[22rem] shadow-lift lg:static lg:w-full lg:shadow-none'
            : 'w-full',
        )}
      >
        {open ? (
          <>
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-4 py-2">
              <h2 className="font-display text-sm font-semibold tracking-tight text-ink">
                Current Situation
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-expanded
                className={cn(
                  'inline-flex min-h-tap items-center justify-center rounded-card px-2 text-ink-muted',
                  'transition-colors duration-150 ease-smooth hover:bg-surface hover:text-ink',
                )}
              >
                <PanelRightClose aria-hidden="true" className="h-[18px] w-[18px]" />
                <span className="sr-only">Collapse the Current Situation drawer</span>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SituationSections situation={situation} dispatch={dispatch} />
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center gap-3 py-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={false}
              className={cn(
                'inline-flex min-h-tap w-full items-center justify-center rounded-card text-ink-muted',
                'transition-colors duration-150 ease-smooth hover:bg-surface hover:text-ink',
              )}
            >
              <PanelRightOpen aria-hidden="true" className="h-[18px] w-[18px]" />
              <span className="sr-only">{`Open the Current Situation drawer. ${summary}.`}</span>
            </button>

            <p
              aria-hidden="true"
              className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-muted [writing-mode:vertical-rl]"
            >
              Current Situation
            </p>

            <div aria-hidden="true" className="mt-auto flex flex-col items-center gap-1.5 pb-1">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-teal/35 bg-teal-soft font-mono text-xs font-bold text-teal-ink">
                {counts.confirmed}
              </span>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-dashed border-amber/50 bg-amber-soft font-mono text-xs font-bold text-amber-ink">
                {counts.suggested}
              </span>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-surface font-mono text-xs font-bold text-ink-muted">
                {counts.run}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
